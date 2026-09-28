"""Repository upload routes."""

import asyncio

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from backend.services.jobs import JobInfo, JobWorker
from backend.services.repositories import (
    JobWorkspace,
    RepositoryService,
    RepositoryUploadError,
)

from .events import event_broker
from .jobs import job_manager

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

repository_service = RepositoryService()
workspace_manager = JobWorkspace()

UPLOAD_FILE = File(...)
REPOSITORY_NAME = Form("repository")


@router.post(
    "/upload",
    response_model=JobInfo,
    status_code=status.HTTP_201_CREATED,
)
async def upload_repository(
    repository: UploadFile = UPLOAD_FILE,
    repository_name: str = REPOSITORY_NAME,
) -> JobInfo:
    """Upload a ZIP repository and start a documentation job."""

    if not repository.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Repository file name is required",
        )

    if not repository.filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Repository must be a ZIP archive",
        )

    job = job_manager.create_job()
    workspace = workspace_manager.create(job.job_id)

    archive_path = workspace / "sample_repository.zip"
    repository_path = workspace / "repository"

    try:
        archive_path.write_bytes(await repository.read())

        repository_service.extract_zip(
            archive_path,
            repository_path,
        )

    except RepositoryUploadError as exc:
        workspace_manager.cleanup(job.job_id)

        job_manager.update_job(
            job.job_id,
            status="failed",
            message="Repository upload failed",
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    worker = JobWorker(
        job_manager=job_manager,
        event_broker=event_broker,
        workspace_manager=workspace_manager,
    )

    asyncio.create_task(
        worker.run(
            job.job_id,
            str(repository_path),
            repository_name,
        )
    )

    return job
