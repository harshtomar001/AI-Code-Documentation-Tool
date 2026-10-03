"""Job lifecycle management for documentation jobs."""

from uuid import uuid4

from core_ai.events import EventPublisher

from .batch_results import BatchResult, BatchResultStore
from .models import JobInfo, JobStatus


class JobManager:
    """Create and track Core AI job lifecycles."""

    def __init__(self) -> None:
        """Initialize the job manager."""
        self._jobs: dict[str, JobInfo] = {}
        self._publishers: dict[str, EventPublisher] = {}
        self._batch_results = BatchResultStore()

    def save_batch_result(self, result: BatchResult) -> BatchResult:
        """Save a completed batch result."""
        return self._batch_results.save(result)

    def get_batch_result(
        self,
        job_id: str,
        batch_id: int,
    ) -> BatchResult | None:
        """Return one batch result for a job."""
        return self._batch_results.get(job_id, batch_id)

    def get_batch_results(self, job_id: str) -> list[BatchResult]:
        """Return all batch results for a job."""
        return self._batch_results.get_all(job_id)

    def get_completed_batch_count(self, job_id: str) -> int:
        """Return the number of completed batches for a job."""
        return self._batch_results.count(job_id)

    def create_job(
        self,
        project_id: str | None = None,
    ) -> JobInfo:
        """Create a new queued job."""
        job_id = str(uuid4())

        job = JobInfo(
            job_id=job_id,
            project_id=project_id,
            status="queued",
            message="Job queued",
        )

        self._jobs[job_id] = job
        self._publishers[job_id] = EventPublisher()

        return job

    def get_job(self, job_id: str) -> JobInfo | None:
        """Return a job by ID."""
        return self._jobs.get(job_id)

    def get_publisher(self, job_id: str) -> EventPublisher | None:
        """Return the event publisher for a job."""
        return self._publishers.get(job_id)

    def update_job(
        self,
        job_id: str,
        *,
        status: JobStatus,
        message: str,
    ) -> JobInfo:
        """Update the status and message of a job."""
        job = self._jobs[job_id]

        updated = JobInfo(
            job_id=job.job_id,
            project_id=job.project_id,
            status=status,
            message=message,
        )

        self._jobs[job_id] = updated
        return updated
