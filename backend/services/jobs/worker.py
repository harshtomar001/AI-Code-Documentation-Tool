"""Background workers for Core AI jobs."""

import asyncio
from concurrent.futures import Future
import logging
from uuid import UUID

logger = logging.getLogger(__name__)

from backend.services.jobs.batch_results import BatchResult
from backend.services.repositories import JobWorkspace
from core_ai.ai.change_generator import ChangeGenerator
from core_ai.ai.context_builder import ContextBuilder
from core_ai.ai.prompt_builder import DocumentationPromptBuilder
from core_ai.ai.provider_factory import ProviderFactory
from core_ai.ai.service import AIService
from core_ai.ai.structured_output import StructuredOutputParser
from core_ai.config import load_environment
from core_ai.events import EventProgress, JobEvent
from core_ai.models.results import AIResult
from core_ai.pipeline import CorePipeline

from database.database import AsyncSessionLocal

from backend.services.documentation import (
    calculate_documentation_metrics,
    save_documentation_batch,
    save_documentation_run,
)

from .event_broker import JobEventBroker
from .manager import JobManager


class JobWorker:
    """Execute the lifecycle of a Core AI documentation job."""

    def __init__(
        self,
        job_manager: JobManager,
        event_broker: JobEventBroker,
        pipeline: CorePipeline | None = None,
        workspace_manager: JobWorkspace | None = None,
    ) -> None:
        """Initialize the worker."""
        self.job_manager = job_manager
        self.event_broker = event_broker
        self.pipeline = pipeline
        self.workspace_manager = workspace_manager

    @staticmethod
    def _create_ai_service() -> AIService:
        """Create the configured Core AI service."""
        load_environment()

        provider = ProviderFactory.create()

        return AIService(
            provider=provider,
            context_builder=ContextBuilder(),
            prompt_builder=DocumentationPromptBuilder(),
            output_parser=StructuredOutputParser(),
            change_generator=ChangeGenerator(),
        )

    async def run(
        self,
        job_id: str,
        repository_path: str,
        repository_name: str = "repository",
        project_id: str | None = None,
    ) -> None:
        """Run the Core AI pipeline for a job."""
        publisher = self.job_manager.get_publisher(job_id)

        if publisher is None:
            return

        loop = asyncio.get_running_loop()

        # Futures used to forward CorePipeline events to the async broker.
        pending_events: list[Future[None]] = []

        # Futures used to persist completed AI batches.
        #
        # IMPORTANT:
        # These are scheduled from the pipeline worker thread.
        # We must NOT call future.result() from that thread because
        # the main asyncio loop is waiting for pipeline.run().
        pending_batch_persistence: list[Future[None]] = []

        async def forward(event: JobEvent) -> None:
            """Forward a Core AI event to the async broker."""
            await self.event_broker.publish(event)

        def schedule_event(event: JobEvent) -> None:
            """Schedule event delivery on the main event loop."""
            future = asyncio.run_coroutine_threadsafe(
                forward(event),
                loop,
            )
            pending_events.append(future)

        publisher.subscribe(schedule_event)

        def handle_batch_result(
            batch_id: int,
            total_batches: int,
            ai_result: AIResult,
        ) -> None:
            """Schedule persistence for one completed AI batch."""

            result = BatchResult(
                job_id=job_id,
                batch_id=batch_id,
                total_batches=total_batches,
                files=ai_result.documentation.files,
                changes=ai_result.changes,
                readme=ai_result.documentation.readme,
            )

            async def persist_batch() -> None:
                """Persist the batch and notify the frontend after completion."""

                try:
                    project_uuid = UUID(project_id) if project_id else None

                    async with AsyncSessionLocal() as db:
                        await save_documentation_batch(
                            db,
                            result=result,
                            project_id=project_uuid,
                        )
                except Exception as exc:
                    logger.warning("Failed to persist documentation batch to database: %s", exc)

                # Keep the in-memory cache for fast access during
                # the active job.
                self.job_manager.save_batch_result(result)

                # Only notify the frontend after the batch
                # has completed.
                publisher.emit(
                    job_id=job_id,
                    stage="batch",
                    type="completed",
                    message=(
                        f"Batch {batch_id}/{total_batches} completed"
                    ),
                    progress=EventProgress(
                        current=batch_id,
                        total=total_batches,
                    ),
                )

            # The CorePipeline executes this callback from the
            # pipeline worker thread.
            #
            # Schedule the async database operation on the main
            # event loop and return immediately.
            #
            # DO NOT call future.result() here.
            future = asyncio.run_coroutine_threadsafe(
                persist_batch(),
                loop,
            )

            pending_batch_persistence.append(future)

        try:
            self.job_manager.update_job(
                job_id,
                status="running",
                message="Job is running",
            )

            publisher.emit(
                job_id=job_id,
                stage="job",
                type="started",
                message="Documentation job started",
            )

            publisher.emit(
                job_id=job_id,
                stage="server",
                type="info",
                message="Repository uploaded",
            )

            if self.pipeline is None:
                pipeline = CorePipeline(
                    ai_service=self._create_ai_service(),
                    event_publisher=publisher,
                    job_id=job_id,
                    batch_result_handler=handle_batch_result,
                )
            else:
                pipeline = self.pipeline
                pipeline.batch_result_handler = handle_batch_result

            pipeline_result = await asyncio.to_thread(
                pipeline.run,
                repository_path,
                repository_name,
            )

            # The pipeline has finished generating all batches.
            #
            # Now the main event loop is free to execute the database
            # persistence coroutines that were scheduled by the
            # pipeline worker thread.
            if pending_batch_persistence:
                await asyncio.gather(
                    *(
                        asyncio.wrap_future(future)
                        for future in pending_batch_persistence
                    )
                )

            if project_id:
                try:
                    project_uuid = UUID(project_id)

                    metrics = calculate_documentation_metrics(
                        pipeline_result,
                    )

                    async with AsyncSessionLocal() as db:
                        await save_documentation_run(
                            db,
                            project_id=project_uuid,
                            **metrics,
                        )
                except Exception as exc:
                    logger.warning("Failed to persist documentation run to database: %s", exc)

            # Wait until all queued CorePipeline events have reached
            # the async event broker.
            if pending_events:
                await asyncio.gather(
                    *(
                        asyncio.wrap_future(future)
                        for future in pending_events
                    )
                )

            self.job_manager.update_job(
                job_id,
                status="completed",
                message="Core AI pipeline completed",
            )

            publisher.emit(
                job_id=job_id,
                stage="job",
                type="completed",
                message="Core AI documentation job completed",
            )

        except Exception as exc:
            self.job_manager.update_job(
                job_id,
                status="failed",
                message=f"Job failed: {exc}",
            )

            publisher.emit(
                job_id=job_id,
                stage="job",
                type="failed",
                message=f"Documentation job failed: {exc}",
            )

            # Make a best effort to finish already-scheduled batch
            # persistence operations before closing the job.
            if pending_batch_persistence:
                await asyncio.gather(
                    *(
                        asyncio.wrap_future(future)
                        for future in pending_batch_persistence
                        if not future.done()
                    ),
                    return_exceptions=True,
                )

            if pending_events:
                await asyncio.gather(
                    *(
                        asyncio.wrap_future(future)
                        for future in pending_events
                        if not future.done()
                    ),
                    return_exceptions=True,
                )

        finally:
            publisher.unsubscribe(schedule_event)

            await self.event_broker.close_job(job_id)

            if self.workspace_manager is not None:
                self.workspace_manager.cleanup(job_id)
