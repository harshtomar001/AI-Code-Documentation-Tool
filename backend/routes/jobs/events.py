"""Job event streaming routes."""

import asyncio
import json
import os
from collections.abc import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.services.jobs.event_broker import JobEventBroker

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
    queue = event_broker.subscribe(job_id)
    delay = get_event_delay()

    try:
        while True:
            event = await queue.get()

            if event is None:
                break

            if delay > 0:
                await asyncio.sleep(delay)

            payload = json.dumps(event.model_dump(mode="json"))

            yield (f"id: {event.event_id}\nevent: {event.stage}\ndata: {payload}\n\n")
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
