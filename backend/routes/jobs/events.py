"""Job event streaming routes."""

import asyncio
import json
import logging
import os
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from core_ai.events import JobEvent
from database.database import AsyncSessionLocal
from database.models import DocumentationBatch
from backend.services.jobs.event_broker import JobEventBroker

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

event_broker = JobEventBroker()


def get_event_delay() -> float:
    """Return the configured SSE event delivery delay in seconds."""
    try:
        return max(0.0, float(os.getenv("CORE_AI_EVENT_STREAM_DELAY", "0")))
    except ValueError:
        return 0.0


async def event_stream(job_id: str) -> AsyncGenerator[str, None]:
    """Stream live events for a job using Server-Sent Events."""
    # Immediately yield connection comment so HTTP 200 headers and CORS are flushed to the client
    yield ": connected\n\n"

    # If the broker has no in-memory events for this job, check if it was completed previously in the database
    if not event_broker.has_events(job_id) and not event_broker.is_closed(job_id):
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(DocumentationBatch)
                    .where(DocumentationBatch.job_id == job_id)
                    .order_by(DocumentationBatch.batch_id.asc())
                )
                batches = result.scalars().all()
                if batches:
                    total_batches = max(
                        [b.total_batches or len(batches) for b in batches] + [len(batches)]
                    )
                    t0 = batches[0].created_at or datetime.now(UTC)

                    await event_broker.publish(
                        JobEvent(
                            job_id=job_id,
                            stage="job",
                            type="started",
                            message="Documentation job started",
                            timestamp=t0,
                        )
                    )
                    await event_broker.publish(
                        JobEvent(
                            job_id=job_id,
                            stage="server",
                            type="info",
                            message="Repository uploaded and analyzed",
                            timestamp=t0,
                        )
                    )
                    await event_broker.publish(
                        JobEvent(
                            job_id=job_id,
                            stage="scan",
                            type="completed",
                            message="Repository files scanned",
                            timestamp=t0,
                        )
                    )
                    await event_broker.publish(
                        JobEvent(
                            job_id=job_id,
                            stage="ast",
                            type="completed",
                            message="AST parsing finished",
                            timestamp=t0,
                        )
                    )
                    await event_broker.publish(
                        JobEvent(
                            job_id=job_id,
                            stage="batching",
                            type="completed",
                            message=f"{total_batches} documentation batches planned",
                            timestamp=t0,
                        )
                    )
                    for b in batches:
                        num_files = len(b.files) if isinstance(b.files, list) else 0
                        await event_broker.publish(
                            JobEvent(
                                job_id=job_id,
                                stage="batch",
                                type="completed",
                                message=f"Batch {b.batch_id}/{total_batches} completed ({num_files} files)",
                                timestamp=b.created_at or t0,
                            )
                        )
                    complete = len(batches) >= total_batches
                    await event_broker.publish(
                        JobEvent(
                            job_id=job_id,
                            stage="job",
                            type="completed" if complete else "failed",
                            message=(
                                "Core AI documentation job completed"
                                if complete
                                else "Job was interrupted. Restart documentation."
                            ),
                            timestamp=batches[-1].created_at or t0,
                        )
                    )
        except Exception as exc:
            logger.warning("Failed to replay job events from database: %s", exc)

    queue = event_broker.subscribe(job_id)
    delay = get_event_delay()

    try:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15)
            except asyncio.TimeoutError:
                yield ": ping\n\n"
                continue

            if event is None:
                break

            if delay > 0:
                await asyncio.sleep(delay)

            payload = json.dumps(event.model_dump(mode="json"))
            yield f"id: {event.event_id}\nevent: {event.stage}\ndata: {payload}\n\n"
    finally:
        event_broker.unsubscribe(job_id, queue)


@router.get("/{job_id}/events")
async def stream_job_events(job_id: str) -> StreamingResponse:
    """Stream live Core AI events for a job."""
    return StreamingResponse(
        event_stream(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
