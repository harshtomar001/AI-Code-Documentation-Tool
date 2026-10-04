import hashlib
import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.database import get_db
from database.models import DocumentationBatch, Project, User
from utils.jwt import verify_access_token
from backend.services.jobs import BatchResult
from core_ai.events import JobEvent

logger = logging.getLogger(__name__)

from .events import event_broker
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

    if not rows:
        try:
            from uuid import UUID
            proj_uuid = UUID(job_id)
            proj_query = (
                select(DocumentationBatch)
                .where(DocumentationBatch.project_id == proj_uuid)
                .order_by(DocumentationBatch.batch_id.asc())
            )
            if user is not None:
                proj_query = (
                    proj_query.join(
                        Project,
                        DocumentationBatch.project_id == Project.id,
                    )
                    .where(Project.user_id == user.id)
                )
            proj_result = await db.execute(proj_query)
            rows = proj_result.scalars().all()
        except (ValueError, TypeError):
            pass

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


@router.post(
    "/{job_id}/batches/{batch_id}/commit",
    response_model=BatchResult,
)
async def commit_job_batch(
    job_id: str,
    batch_id: int,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> BatchResult:
    """Mark a batch result as committed."""

    # Update in-memory cache if present
    in_memory = job_manager.get_batch_result(job_id, batch_id)
    if in_memory is not None:
        in_memory.status = "committed"

    try:
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

        if row is not None:
            row.status = "committed"
            await db.commit()
            await db.refresh(row)
            res = serialize_batch(row)
            try:
                await event_broker.publish(
                    JobEvent(
                        job_id=job_id,
                        stage="batch",
                        type="committed",
                        message=f"Batch {batch_id} committed",
                    )
                )
            except Exception as exc:
                logger.warning("Failed to publish batch committed event: %s", exc)
            return res
    except Exception as exc:
        logger.warning("Failed to update database documentation batch status: %s", exc)

    if in_memory is not None:
        try:
            await event_broker.publish(
                JobEvent(
                    job_id=job_id,
                    stage="batch",
                    type="committed",
                    message=f"Batch {batch_id} committed",
                )
            )
        except Exception as exc:
            logger.warning("Failed to publish batch committed event: %s", exc)
        return in_memory

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Batch result not found",
    )


@router.post(
    "/{job_id}/commit",
    response_model=list[BatchResult],
)
async def commit_all_job_batches(
    job_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> list[BatchResult]:
    """Mark all batches for a job as committed."""

    # Update in-memory cache if present
    in_memory = job_manager.get_batch_results(job_id)
    for item in in_memory:
        item.status = "committed"

    try:
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

        if rows:
            for row in rows:
                row.status = "committed"
            await db.commit()
            for row in rows:
                await db.refresh(row)
            res_rows = [serialize_batch(row) for row in rows]
            try:
                await event_broker.publish(
                    JobEvent(
                        job_id=job_id,
                        stage="job",
                        type="completed",
                        message="All documentation batches committed",
                    )
                )
            except Exception as exc:
                logger.warning("Failed to publish commit all event: %s", exc)
            return res_rows
    except Exception as exc:
        logger.warning("Failed to commit all database documentation batches: %s", exc)

    try:
        await event_broker.publish(
            JobEvent(
                job_id=job_id,
                stage="job",
                type="completed",
                message="All documentation batches committed",
            )
        )
    except Exception as exc:
        logger.warning("Failed to publish commit all event: %s", exc)

    return in_memory


@router.get("/{job_id}/commits")
async def get_job_commits(
    job_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Return committed batches for a job formatted as commit entries."""
    in_memory = job_manager.get_batch_results(job_id)
    committed_in_memory = [b for b in in_memory if getattr(b, "status", None) == "committed"]
    if committed_in_memory:
        commits: list[dict] = []
        for b in committed_in_memory:
            num_files = len(b.files) if isinstance(b.files, list) else 0
            file_word = "file" if num_files == 1 else "files"
            msg = (
                f"docs: batch {b.batch_id}, {num_files} {file_word}"
                if num_files > 0
                else f"docs: batch {b.batch_id}"
            )
            changes_count = (
                len(b.changes)
                if isinstance(b.changes, list) and len(b.changes) > 0
                else (num_files or 1)
            )
            commits.append({
                "sha": hashlib.sha1(f"{b.job_id}:{b.batch_id}".encode()).hexdigest()[:7],
                "message": msg,
                "batch_ids": [b.batch_id],
                "changes": changes_count,
                "committed_at": datetime.now(UTC).isoformat(),
            })
        return commits

    rows = []
    try:
        query = (
            select(DocumentationBatch)
            .where(
                DocumentationBatch.job_id == job_id,
                DocumentationBatch.status == "committed",
            )
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

        if not rows:
            try:
                from uuid import UUID
                proj_uuid = UUID(job_id)
                proj_query = (
                    select(DocumentationBatch)
                    .where(
                        DocumentationBatch.project_id == proj_uuid,
                        DocumentationBatch.status == "committed",
                    )
                    .order_by(DocumentationBatch.batch_id.asc())
                )
                if user is not None:
                    proj_query = (
                        proj_query.join(
                            Project,
                            DocumentationBatch.project_id == Project.id,
                        )
                        .where(Project.user_id == user.id)
                    )
                proj_result = await db.execute(proj_query)
                rows = proj_result.scalars().all()
            except (ValueError, TypeError):
                pass
    except Exception as exc:
        logger.warning("Failed to fetch committed batches from database: %s", exc)

    commits = []
    for row in rows:
        num_files = len(row.files) if isinstance(row.files, list) else 0
        file_word = "file" if num_files == 1 else "files"
        msg = (
            f"docs: batch {row.batch_id}, {num_files} {file_word}"
            if num_files > 0
            else f"docs: batch {row.batch_id}"
        )
        changes_count = (
            len(row.changes)
            if isinstance(row.changes, list) and len(row.changes) > 0
            else (num_files or 1)
        )
        commits.append({
            "sha": hashlib.sha1(f"{row.job_id}:{row.batch_id}".encode()).hexdigest()[:7],
            "message": msg,
            "batch_ids": [row.batch_id],
            "changes": changes_count,
            "committed_at": (
                row.created_at.isoformat()
                if row.created_at
                else datetime.now(UTC).isoformat()
            ),
        })

    return commits


