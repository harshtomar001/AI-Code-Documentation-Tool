"""Batch result routes."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.database import get_db
from database.models import DocumentationBatch, Project, User
from utils.jwt import verify_access_token
from backend.services.jobs import BatchResult

from .jobs import job_manager


router = APIRouter(prefix="/api/jobs", tags=["jobs"])


async def get_optional_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Retrieve user if an Authorization Bearer token is provided."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        payload = verify_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        result = await db.execute(
            select(User).where(User.id == int(user_id))
        )
        return result.scalar_one_or_none()
    except Exception:
        return None


def serialize_batch(row: DocumentationBatch) -> BatchResult:
    """Convert a database batch row into the API batch result model."""

    return BatchResult(
        job_id=row.job_id,
        batch_id=row.batch_id,
        total_batches=row.total_batches,
        status=row.status,
        files=row.files or [],
        changes=row.changes or [],
        readme=row.readme,
    )


@router.get(
    "/{job_id}/batches",
    response_model=list[BatchResult],
)
async def get_job_batches(
    job_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> list[BatchResult]:
    """Return all completed batches for a job."""

    in_memory = job_manager.get_batch_results(job_id)
    if in_memory:
        return in_memory

    query = (
        select(DocumentationBatch)
        .where(DocumentationBatch.job_id == job_id)
        .order_by(DocumentationBatch.batch_id.asc())
    )

    if user is not None:
        query = (
            query.join(
                Project,
                DocumentationBatch.project_id == Project.id,
            )
            .where(Project.user_id == user.id)
        )

    result = await db.execute(query)
    rows = result.scalars().all()

    return [
        serialize_batch(row)
        for row in rows
    ]


@router.get(
    "/{job_id}/batches/{batch_id}",
    response_model=BatchResult,
)
async def get_batch_result(
    job_id: str,
    batch_id: int,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> BatchResult:
    """Return one completed batch result."""

    in_memory = job_manager.get_batch_result(job_id, batch_id)
    if in_memory is not None:
        return in_memory

    query = (
        select(DocumentationBatch)
        .where(
            DocumentationBatch.job_id == job_id,
            DocumentationBatch.batch_id == batch_id,
        )
    )

    if user is not None:
        query = (
            query.join(
                Project,
                DocumentationBatch.project_id == Project.id,
            )
            .where(Project.user_id == user.id)
        )

    result = await db.execute(query)
    row = result.scalar_one_or_none()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch result not found",
        )

    return serialize_batch(row)
