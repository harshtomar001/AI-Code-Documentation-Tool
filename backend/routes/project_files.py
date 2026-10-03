"""Project file storage routes."""

from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import get_db
from database.models import Project, User
from routes.auth.auth import get_current_user
from services.projects.project_storage import (
    MAX_FILE_BYTES,
    MAX_FILE_COUNT,
    MAX_TOTAL_BYTES,
    ProjectStorage,
    ProjectStorageError,
)

router = APIRouter(
    prefix="/api/projects",
    tags=["Project Files"],
)

project_storage = ProjectStorage()


@router.post("/{project_id}/files")
async def upload_project_files(
    project_id: UUID,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Persist files belonging to a user's project."""

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

    if project.source_type != "upload":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only uploaded projects can store local files",
        )

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one file is required",
        )

    if len(files) > MAX_FILE_COUNT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project contains too many files",
        )

    project_root = project_storage.project_root(str(project.id))

    project_storage.clear_project(str(project.id))
    project_root.mkdir(parents=True, exist_ok=True)

    total_bytes = 0
    saved_files = []

    try:
        for upload in files:
            relative_name = upload.filename or ""

            relative_path = project_storage.safe_relative_path(
                relative_name
            )

            destination = (
                project_root / relative_path
            ).resolve()

            if not project_storage._is_inside(
                project_root.resolve(),
                destination,
            ):
                raise ProjectStorageError(
                    "Unsafe file path"
                )

            content = await upload.read()

            file_size = len(content)

            if file_size > MAX_FILE_BYTES:
                raise ProjectStorageError(
                    f"File exceeds the maximum allowed size: {relative_name}"
                )

            total_bytes += file_size

            if total_bytes > MAX_TOTAL_BYTES:
                raise ProjectStorageError(
                    "Project exceeds the maximum allowed storage size"
                )

            destination.parent.mkdir(
                parents=True,
                exist_ok=True,
            )

            destination.write_bytes(content)

            saved_files.append(
                {
                    "path": relative_path.as_posix(),
                    "size": file_size,
                }
            )

    except ProjectStorageError as exc:
        project_storage.clear_project(str(project.id))

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        project_storage.clear_project(str(project.id))

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to store project files",
        ) from exc

    project.local_storage_path = str(project_root)
    project.status = "uploaded"

    await db.commit()
    await db.refresh(project)

    return {
        "project_id": str(project.id),
        "files_uploaded": len(saved_files),
        "total_bytes": total_bytes,
        "files": saved_files,
    }


@router.get("/{project_id}/files")
async def get_project_files(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the stored file structure for a user's project."""

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

    if project.source_type != "upload":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only uploaded projects have local files",
        )

    project_root = project_storage.project_root(
        str(project.id)
    )

    if not project_root.exists():
        return {
            "project_id": str(project.id),
            "files": [],
        }

    files = []

    for path in project_root.rglob("*"):
        if not path.is_file():
            continue

        relative_path = path.relative_to(project_root)

        files.append(
            {
                "path": relative_path.as_posix(),
                "size": path.stat().st_size,
            }
        )

    files.sort(key=lambda file: file["path"])

    return {
        "project_id": str(project.id),
        "files": files,
    }

@router.get("/{project_id}/files/content")
async def get_project_file_content(
    project_id: UUID,
    path: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    if project.source_type != "upload":
        raise HTTPException(
            status_code=400,
            detail="Only uploaded projects have local files",
        )

    try:
        relative_path = project_storage.safe_relative_path(path)
    except ProjectStorageError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    project_root = project_storage.project_root(
        str(project.id)
    )

    file_path = (project_root / relative_path).resolve()

    if not project_storage._is_inside(
        project_root.resolve(),
        file_path,
    ):
        raise HTTPException(
            status_code=400,
            detail="Unsafe file path",
        )

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    if file_path.stat().st_size > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="File is too large to display",
        )

    try:
        content = file_path.read_text(
            encoding="utf-8",
            errors="replace",
        )
    except OSError as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to read file",
        ) from exc

    return PlainTextResponse(content)