"""Batch result routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.database import get_db
from database.models import DocumentationBatch, Project, User
from routes.auth.auth import get_current_user

from backend.services.jobs import BatchResult


router = APIRouter(prefix="/api/jobs", tags=["jobs"])


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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BatchResult]:
    """Return all persisted completed batches for a user's project."""

    result = await db.execute(
        select(DocumentationBatch)
        .join(
            Project,
            DocumentationBatch.project_id == Project.id,
        )
        .where(
            DocumentationBatch.job_id == job_id,
            Project.user_id == current_user.id,
        )
        .order_by(
            DocumentationBatch.batch_id.asc(),
        )
    )

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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BatchResult:
    """Return one persisted batch result."""

    result = await db.execute(
        select(DocumentationBatch)
        .join(
            Project,
            DocumentationBatch.project_id == Project.id,
        )
        .where(
            DocumentationBatch.job_id == job_id,
            DocumentationBatch.batch_id == batch_id,
            Project.user_id == current_user.id,
        )
    )

    row = result.scalar_one_or_none()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch result not found",
        )

    return serialize_batch(row)
