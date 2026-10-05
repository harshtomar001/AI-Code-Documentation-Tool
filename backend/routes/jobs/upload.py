"""Repository upload routes."""

import asyncio
import shutil
from pathlib import Path
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.database import get_db
from database.models import Project, User
from backend.services.jobs import JobInfo, JobWorker
from backend.services.projects.project_storage import ProjectStorage
from backend.services.repositories import (
    JobWorkspace,
    RepositoryService,
    RepositoryUploadError,
)
from backend.services.repositories.repository_service import MAX_ARCHIVE_BYTES

from .events import event_broker
from .jobs import get_current_user_flexible, job_manager

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

repository_service = RepositoryService()
workspace_manager = JobWorkspace()
project_storage = ProjectStorage()

UPLOAD_FILE = File(...)
REPOSITORY_NAME = Form("repository")


async def get_upload_user(
    request: Request,
    token: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve current user for upload endpoint."""
    return await get_current_user_flexible(request, token=token, db=db)


@router.post(
    "/upload",
    response_model=JobInfo,
    status_code=status.HTTP_201_CREATED,
)
async def upload_repository(
    request: Request,
    repository: UploadFile = UPLOAD_FILE,
    repository_name: str = REPOSITORY_NAME,
    project_id: str | None = Form(None),
    current_user: User = Depends(get_upload_user),
    db: AsyncSession = Depends(get_db),
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

    archive_bytes = await repository.read()

    if len(archive_bytes) > MAX_ARCHIVE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Repository archive exceeds maximum allowed size ({MAX_ARCHIVE_BYTES // (1024 * 1024)}MB)",
        )

    # 1. Project record association and persistence
    target_project = None
    if project_id:
        try:
            parsed_id = UUID(project_id)
            result = await db.execute(
                select(Project).where(
                    Project.id == parsed_id,
                    Project.user_id == current_user.id,
                )
            )
            target_project = result.scalar_one_or_none()
        except (ValueError, Exception):
            target_project = None

    if target_project is None:
        clean_repo_name = repository_name.strip() or "Uploaded Project"
        try:
            result = await db.execute(
                select(Project).where(
                    Project.user_id == current_user.id,
                    Project.source_type == "upload",
                    Project.name == clean_repo_name,
                )
            )
            target_project = result.scalar_one_or_none()
        except Exception:
            target_project = None

    if target_project is None:
        clean_repo_name = repository_name.strip() or "Uploaded Project"
        target_project = Project(
            user_id=current_user.id,
            name=clean_repo_name,
            description=f"Local repository {clean_repo_name}",
            source_type="upload",
            status="uploaded",
            documentation_progress=0,
        )
        try:
            db.add(target_project)
            await db.commit()
            await db.refresh(target_project)
        except Exception:
            pass
    else:
        target_project.status = "uploaded"
        try:
            await db.commit()
            await db.refresh(target_project)
        except Exception:
            pass

    project_id_str = str(target_project.id) if target_project and target_project.id else None

    # 2. Create job and temporary workspace for worker execution
    job = job_manager.create_job(
        project_id=project_id_str,
    )
    workspace = workspace_manager.create(job.job_id)

    archive_path = workspace / "sample_repository.zip"
    repository_path = workspace / "repository"

    try:
        archive_path.write_bytes(archive_bytes)

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

        error_message = str(exc)
        status_code = (
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            if "maximum allowed size" in error_message
            else status.HTTP_400_BAD_REQUEST
        )

        raise HTTPException(
            status_code=status_code,
            detail=error_message,
        ) from exc

    # 3. Store persistent repository files in ProjectStorage
    # so they remain available after job execution and can be viewed
    # in the Repository workspace (/repository/uploaded/{projectId})
    if project_id_str:
        try:
            project_root = project_storage.project_root(project_id_str)
            project_storage.clear_project(project_id_str)
            project_root.mkdir(parents=True, exist_ok=True)
            shutil.copytree(repository_path, project_root, dirs_exist_ok=True)

            target_project.local_storage_path = str(project_root)
            await db.commit()
            await db.refresh(target_project)
        except Exception:
            pass

    # 4. Run the JobWorker
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
            project_id_str,
        )
    )

    return job
