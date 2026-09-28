"""Storage for completed Core AI batch results."""

from pydantic import BaseModel, Field

from core_ai.models.changes import BeforeAfterChange
from core_ai.models.documentation import DocumentationFile


class BatchResult(BaseModel):
    """Represent the result produced by one completed documentation batch."""

    job_id: str
    batch_id: int
    total_batches: int
    status: str = "completed"
    files: list[DocumentationFile] = Field(default_factory=list)
    changes: list[BeforeAfterChange] = Field(default_factory=list)
    readme: str | None = None


class BatchResultStore:
    """Store completed batch results for active jobs."""

    def __init__(self) -> None:
        """Initialize the in-memory batch result store."""
        self._results: dict[str, dict[int, BatchResult]] = {}

    def save(self, result: BatchResult) -> BatchResult:
        """Save a completed batch result."""
        job_results = self._results.setdefault(result.job_id, {})
        job_results[result.batch_id] = result
        return result

    def get(self, job_id: str, batch_id: int) -> BatchResult | None:
        """Return one batch result."""
        return self._results.get(job_id, {}).get(batch_id)

    def get_all(self, job_id: str) -> list[BatchResult]:
        """Return all results for a job in batch order."""
        results = self._results.get(job_id, {})
        return [results[batch_id] for batch_id in sorted(results)]

    def count(self, job_id: str) -> int:
        """Return the number of completed batches for a job."""
        return len(self._results.get(job_id, {}))

    def clear(self, job_id: str) -> None:
        """Remove all batch results for a job."""
        self._results.pop(job_id, None)
