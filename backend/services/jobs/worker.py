"""Background workers for Core AI jobs."""

import asyncio
from concurrent.futures import Future

from backend.services.jobs.batch_results import BatchResult
from backend.services.repositories import JobWorkspace
from core_ai.ai.change_generator import ChangeGenerator
from core_ai.ai.context_builder import ContextBuilder
from core_ai.ai.prompt_builder import DocumentationPromptBuilder
from core_ai.ai.provider_factory import ProviderFactory
from core_ai.ai.service import AIService
from core_ai.ai.structured_output import StructuredOutputParser
from core_ai.config import load_environment
from core_ai.events import JobEvent
from core_ai.models.results import AIResult
from core_ai.pipeline import CorePipeline

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
    ) -> None:
        """Run the Core AI pipeline for a job."""
        publisher = self.job_manager.get_publisher(job_id)

        if publisher is None:
            return

        loop = asyncio.get_running_loop()
        pending_events: list[Future[None]] = []

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
            """Store one completed batch and publish its completion event."""
            result = BatchResult(
                job_id=job_id,
                batch_id=batch_id,
                total_batches=total_batches,
                files=ai_result.documentation.files,
                changes=ai_result.changes,
                readme=ai_result.documentation.readme,
            )

            # Store first so the frontend can safely fetch the result
            # as soon as it receives the SSE completion event.
            self.job_manager.save_batch_result(result)

            publisher.emit(
                job_id=job_id,
                stage="batch",
                type="completed",
                message=f"Batch {batch_id}/{total_batches} completed",
                current=batch_id,
                total=total_batches,
            )

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
                message="Repository reached the Core AI server",
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

            await asyncio.to_thread(
                pipeline.run,
                repository_path,
                repository_name,
            )

            if pending_events:
                await asyncio.gather(
                    *(asyncio.wrap_future(future) for future in pending_events)
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
                message="Job failed",
            )

            publisher.emit(
                job_id=job_id,
                stage="job",
                type="failed",
                message=f"Documentation job failed: {exc}",
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
