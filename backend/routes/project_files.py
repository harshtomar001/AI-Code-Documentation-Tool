"""Project file storage routes."""

from pathlib import Path
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database.database import get_db
from database.models import DocumentationBatch, Project, User
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

    # Include generated README.md if produced during documentation pipeline
    batch_result = await db.execute(
        select(DocumentationBatch)
        .where(DocumentationBatch.project_id == project_id)
        .order_by(DocumentationBatch.batch_id.asc())
    )
    batches = batch_result.scalars().all()
    latest_readme = next((b.readme for b in reversed(batches) if b.readme), None)
    has_readme_in_files = any(
        f["path"].lower() == "readme.md" or f["path"].lower().endswith("/readme.md")
        for f in files
    )
    if latest_readme and not has_readme_in_files:
        files.insert(
            0,
            {
                "path": "README.md",
                "size": len(latest_readme.encode("utf-8")),
                "is_generated": True,
            },
        )

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

    clean_posix = relative_path.as_posix().lower()
    is_readme_req = clean_posix == "readme.md" or clean_posix.endswith("/readme.md")

    # Fetch batches for this project
    batch_result = await db.execute(
        select(DocumentationBatch)
        .where(DocumentationBatch.project_id == project_id)
        .order_by(DocumentationBatch.batch_id.asc())
    )
    batches = batch_result.scalars().all()

    # If requested file is README.md and a batch generated one, return it
    if is_readme_req:
        for b in reversed(batches):
            if b.readme:
                return PlainTextResponse(b.readme)

    # Locate file on disk with flexibility for single root directory wrapping or stripping
    file_path = (project_root / relative_path).resolve()
    if not (file_path.exists() and file_path.is_file()):
        candidate = None
        if project_root.exists() and project_root.is_dir():
            for child in project_root.iterdir():
                if child.is_dir() and not child.name.startswith("."):
                    nested = (child / relative_path).resolve()
                    if nested.exists() and nested.is_file():
                        candidate = nested
                        break
        if candidate:
            file_path = candidate
        elif len(relative_path.parts) > 1:
            stripped_path = (project_root / Path(*relative_path.parts[1:])).resolve()
            if stripped_path.exists() and stripped_path.is_file():
                file_path = stripped_path

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

    # Apply batch documentation changes (insert generated docstrings)
    req_posix = relative_path.as_posix().replace("\\", "/").lstrip("/")
    req_name = file_path.name
    for b in batches:
        for ch in b.changes or []:
            if isinstance(ch, dict):
                ch_file = (ch.get("file") or "").replace("\\", "/").lstrip("/")
                # Match path directly, as suffix, or matching basename
                matches = (
                    ch_file == req_posix
                    or req_posix.endswith("/" + ch_file)
                    or ch_file.endswith("/" + req_posix)
                    or req_name == ch_file.split("/")[-1]
                )
                if matches:
                    before = ch.get("before")
                    after = ch.get("after")
                    if before and after and before in content:
                        content = content.replace(before, after, 1)

    return PlainTextResponse(content)