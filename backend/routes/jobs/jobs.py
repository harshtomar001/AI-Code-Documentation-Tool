"""Job creation routes."""

import asyncio
import io
import re
import zipfile
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.database import get_db
from database.models import DocumentationBatch, Project, User
from backend.routes.auth.auth import get_current_user
from backend.services.jobs import JobInfo, JobManager, JobWorker
from backend.services.projects.project_storage import ProjectStorage
from utils.jwt import verify_access_token

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

    project.status = "processing"
    await db.commit()

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
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
) -> JobInfo:
    """Return the current status of a Core AI job."""

    job = job_manager.get_job(job_id)

    if job is None:
        result = await db.execute(
            select(DocumentationBatch).where(DocumentationBatch.job_id == job_id)
        )
        rows = result.scalars().all()
        if rows:
            total = max((r.total_batches or 0) for r in rows)
            complete = total > 0 and len(rows) >= total
            return JobInfo(
                job_id=job_id,
                project_id=str(rows[0].project_id) if rows[0].project_id else None,
                status="completed" if complete else "failed",
                message=(
                    "Core AI documentation job completed"
                    if complete
                    else "Job was interrupted"
                ),
            )

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    return job
 
 
async def get_current_user_flexible(
    request: Request,
    token: str | None = None,
    db: AsyncSession = None,
) -> User:
    """Authenticate a user from Bearer header, query param, or cookies."""
    raw_token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        raw_token = auth_header.split(" ", 1)[1]
    elif token:
        raw_token = token
    elif "access_token" in request.cookies:
        raw_token = request.cookies.get("access_token")

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
        )

    payload = verify_access_token(raw_token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    try:
        user_int_id = int(user_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identity in token",
        ) from exc

    result = await db.execute(
        select(User).where(User.id == user_int_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


@router.get("/{job_id}/download")
async def download_job_archive(
    job_id: str,
    request: Request,
    token: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Package the documented repository and stream it as a ZIP archive."""
    current_user = await get_current_user_flexible(request, token=token, db=db)

    batch_result = await db.execute(
        select(DocumentationBatch)
        .where(DocumentationBatch.job_id == job_id)
        .order_by(DocumentationBatch.batch_id.asc())
    )
    batches = batch_result.scalars().all()

    project = None
    if batches and batches[0].project_id:
        proj_result = await db.execute(
            select(Project).where(
                Project.id == batches[0].project_id,
                Project.user_id == current_user.id,
            )
        )
        project = proj_result.scalar_one_or_none()

    if project is None:
        job = job_manager.get_job(job_id)
        if job and job.project_id:
            try:
                proj_uuid = UUID(job.project_id)
                proj_result = await db.execute(
                    select(Project).where(
                        Project.id == proj_uuid,
                        Project.user_id == current_user.id,
                    )
                )
                project = proj_result.scalar_one_or_none()
            except ValueError:
                pass

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project or documentation job not found",
        )

    project_root = project_storage.project_root(str(project.id))
    if not project_root.exists() or not project_root.is_dir():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project storage files are not available",
        )

    # Determine effective root if files are nested inside a single subdirectory
    subdirs = [
        p for p in project_root.iterdir()
        if p.is_dir() and not p.name.startswith(".")
    ]
    files_in_root = [
        p for p in project_root.iterdir()
        if p.is_file() and not p.name.startswith(".")
    ]

    effective_root = (
        subdirs[0]
        if len(subdirs) == 1 and len(files_in_root) == 0
        else project_root
    )

    # Collect changes and README across all batches
    file_changes: dict[str, list[dict]] = {}
    latest_readme: str | None = None

    for batch in batches:
        if batch.readme:
            latest_readme = batch.readme
        for change in batch.changes or []:
            if isinstance(change, dict):
                raw_file = change.get("file")
                if raw_file:
                    norm = raw_file.replace("\\", "/").lstrip("/")
                    file_changes.setdefault(norm, []).append(change)

    # Build ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in effective_root.rglob("*"):
            if not file_path.is_file():
                continue

            try:
                rel_path = file_path.relative_to(effective_root)
            except ValueError:
                continue

            rel_posix = rel_path.as_posix()
            parts = rel_path.parts

            # Security guards: exclude hidden/sensitive files
            if any(p.startswith(".") and p != ".gitignore" for p in parts):
                continue
            if any(
                p in {"__pycache__", ".project_storage", "venv", ".venv", "node_modules"}
                for p in parts
            ):
                continue
            if rel_path.name in {".env", ".env.local", ".env.production"}:
                continue
            if rel_posix.lower() == "readme.md" and latest_readme:
                continue

            # Apply documentation changes if any exist for this file
            matched_changes = (
                file_changes.get(rel_posix)
                or file_changes.get(f"{effective_root.name}/{rel_posix}")
            )
            if matched_changes:
                try:
                    content = file_path.read_text(
                        encoding="utf-8",
                        errors="replace",
                    )
                    for ch in matched_changes:
                        before = ch.get("before")
                        after = ch.get("after")
                        if before and after and before in content:
                            content = content.replace(before, after, 1)
                    zf.writestr(rel_posix, content.encode("utf-8"))
                    continue
                except Exception:
                    pass

            # Write file as is
            try:
                zf.write(file_path, arcname=rel_posix)
            except Exception:
                pass

        # Write generated README.md if present
        if latest_readme:
            zf.writestr("README.md", latest_readme.encode("utf-8"))

    zip_buffer.seek(0)
    clean_name = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", project.name or "repository")
    filename = f"{clean_name}_documented.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )

