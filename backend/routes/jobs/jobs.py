"""Job creation routes."""

import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.database import get_db
from database.models import Project, User
from backend.routes.auth.auth import get_current_user
from backend.services.jobs import JobInfo, JobManager, JobWorker
from backend.services.projects.project_storage import ProjectStorage

from .events import event_broker


router = APIRouter(prefix="/api/jobs", tags=["jobs"])

job_manager = JobManager()
project_storage = ProjectStorage()


class CreateJobRequest(BaseModel):
    """Request data for creating a documentation job."""

    project_id: str
    repository_name: str = "repository"


@router.post(
    "",
    response_model=JobInfo,
    status_code=status.HTTP_201_CREATED,
)
async def create_job(
    request: CreateJobRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobInfo:
    """Create and start a documentation job from a stored project."""

    try:
        project_id = UUID(request.project_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid project ID",
        ) from exc

    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )

    project = result.scalar_one_or_none()

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    repository_path = project_storage.project_root(
        str(project.id)
    )

    if not repository_path.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project files are not available",
        )

    if not repository_path.is_dir():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project storage path is invalid",
        )

    job = job_manager.create_job(
        project_id=str(project.id),
    )

    worker = JobWorker(
        job_manager=job_manager,
        event_broker=event_broker,
    )

    asyncio.create_task(
        worker.run(
            job.job_id,
            str(repository_path),
            request.repository_name,
            str(project.id),
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
