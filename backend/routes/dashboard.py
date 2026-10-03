"""Dashboard routes."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.database import get_db
from database.models import DocumentationRun, Project, User
from routes.auth.auth import get_current_user

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)


@router.get("/documentation-runs")
async def get_documentation_runs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return documentation runs belonging to the current user."""

    result = await db.execute(
        select(DocumentationRun)
        .join(
            Project,
            DocumentationRun.project_id == Project.id,
        )
        .where(
            Project.user_id == current_user.id,
        )
        .order_by(
            DocumentationRun.created_at.desc(),
        )
    )

    runs = result.scalars().all()

    return {
        "runs": [
            {
                "id": run.id,
                "project_id": run.project_id,
                "docstrings_count": run.docstrings_count,
                "comments_count": run.comments_count,
                "readme_count": run.readme_count,
                "functions_count": run.functions_count,
                "classes_count": run.classes_count,
                "methods_count": run.methods_count,
                "modules_count": run.modules_count,
                "created_at": (
                    run.created_at.isoformat()
                    if run.created_at
                    else None
                ),
            }
            for run in runs
        ]
    }
