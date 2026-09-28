"""Job creation routes."""

import asyncio

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from backend.services.jobs import JobInfo, JobManager, JobWorker

from .events import event_broker

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

job_manager = JobManager()


class CreateJobRequest(BaseModel):
    """Request data for creating a documentation job."""

    repository_path: str
    repository_name: str = "repository"


@router.post(
    "",
    response_model=JobInfo,
    status_code=status.HTTP_201_CREATED,
)
async def create_job(request: CreateJobRequest) -> JobInfo:
    """Create and start a new Core AI documentation job."""
    job = job_manager.create_job()

    worker = JobWorker(
        job_manager=job_manager,
        event_broker=event_broker,
    )

    asyncio.create_task(
        worker.run(
            job.job_id,
            request.repository_path,
            request.repository_name,
        )
    )

    return job


@router.get(
    "/{job_id}",
    response_model=JobInfo,
)
async def get_job(job_id: str) -> JobInfo:
    """Return the current status of a Core AI job."""
    job = job_manager.get_job(job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    return job
