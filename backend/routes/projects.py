from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.database import get_db
from database.models import Project, User
from routes.auth.auth import get_current_user
from schemas.project import ProjectCreateRequest

router = APIRouter(prefix="/api/projects", tags=["Projects"])



def serialize_project(project: Project) -> dict:
    return {
        "id": project.id,
        "user_id": project.user_id,
        "name": project.name,
        "description": project.description,
        "source_type": project.source_type,
        "github_owner": project.github_owner,
        "github_repo": project.github_repo,
        "github_url": project.github_url,
        "local_storage_path": project.local_storage_path,
        "language": project.language,
        "status": project.status,
        "documentation_progress": project.documentation_progress,
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    name = data.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project name is required",
        )

    source_type = data.source_type.strip().lower()
    allowed_sources = {"github", "upload", "url", "manual"}

    if source_type not in allowed_sources:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid project source type",
        )

    # Avoid duplicate records when the same GitHub repository
    # is imported again by the same user.
    if source_type == "github" and data.github_owner and data.github_repo:
        existing_result = await db.execute(
            select(Project).where(
                Project.user_id == current_user.id,
                Project.source_type == "github",
                Project.github_owner == data.github_owner.strip(),
                Project.github_repo == data.github_repo.strip(),
            )
        )
        existing_project = existing_result.scalar_one_or_none()

        if existing_project:
            existing_project.name = name
            existing_project.description = (data.description or "").strip() or None
            existing_project.github_url = (data.github_url or "").strip() or None
            existing_project.language = (data.language or "").strip() or None
            existing_project.status = (data.status or "imported").strip() or "imported"
            existing_project.documentation_progress = data.documentation_progress

            await db.commit()
            await db.refresh(existing_project)
            return serialize_project(existing_project)

    project = Project(
        user_id=current_user.id,
        name=name,
        description=(data.description or "").strip() or None,
        source_type=source_type,
        github_owner=(data.github_owner or "").strip() or None,
        github_repo=(data.github_repo or "").strip() or None,
        github_url=(data.github_url or "").strip() or None,
        local_storage_path=(data.local_storage_path or "").strip() or None,
        language=(data.language or "").strip() or None,
        status=(data.status or "created").strip() or "created",
        documentation_progress=data.documentation_progress,
    )

    db.add(project)
    await db.commit()
    await db.refresh(project)

    return serialize_project(project)


@router.get("")
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(Project.updated_at.desc(), Project.id.desc())
    )

    projects = result.scalars().all()

    return {
        "projects": [serialize_project(project) for project in projects]
    }


@router.get("/{project_id}")
async def get_project(
    project_id: int,
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

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return serialize_project(project)


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
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

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    await db.delete(project)
    await db.commit()

    return {
        "message": "Project deleted successfully",
        "id": project_id,
    }
