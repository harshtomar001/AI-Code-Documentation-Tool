"""Batch result routes."""

from fastapi import APIRouter, HTTPException, status

from backend.services.jobs import BatchResult, BatchResultStore

from .jobs import job_manager

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

batch_result_store = BatchResultStore()


@router.get("/{job_id}/batches")
async def get_job_batches(job_id: str) -> list[BatchResult]:
    """Return all completed batch results for a job."""
    return batch_result_store.get_all(job_id)


@router.get("/{job_id}/batches/{batch_id}")
async def get_batch_result(
    job_id: str,
    batch_id: int,
) -> BatchResult:
    """Return one completed batch result."""
    result = job_manager.get_batch_result(job_id, batch_id)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch result not found",
        )

    return result
