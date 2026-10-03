"""Persistence helpers for documentation runs and batches."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import DocumentationBatch, DocumentationRun, Project

if TYPE_CHECKING:
    from backend.services.jobs.batch_results import BatchResult


async def save_documentation_run(
    db: AsyncSession,
    *,
    project_id: UUID,
    docstrings_count: int,
    comments_count: int,
    readme_count: int,
    functions_count: int,
    classes_count: int,
    methods_count: int,
    modules_count: int,
) -> DocumentationRun:
    run = DocumentationRun(
        project_id=project_id,
        docstrings_count=docstrings_count,
        comments_count=comments_count,
        readme_count=readme_count,
        functions_count=functions_count,
        classes_count=classes_count,
        methods_count=methods_count,
        modules_count=modules_count,
    )

    db.add(run)

    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()
    if project:
        project.status = "completed"
        project.documentation_progress = 100

    await db.commit()
    await db.refresh(run)

    return run


async def save_documentation_batch(
    db: AsyncSession,
    *,
    result: BatchResult,
    project_id: UUID | None,
) -> DocumentationBatch:
    batch = DocumentationBatch(
        job_id=result.job_id,
        project_id=project_id,
        batch_id=result.batch_id,
        total_batches=result.total_batches,
        status=result.status,
        files=[
            file.model_dump(mode="json")
            for file in result.files
        ],
        changes=[
            change.model_dump(mode="json")
            for change in result.changes
        ],
        readme=result.readme,
    )

    db.add(batch)
    await db.commit()
    await db.refresh(batch)

    return batch
