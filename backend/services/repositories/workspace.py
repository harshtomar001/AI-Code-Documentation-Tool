"""Persistent workspaces for documentation jobs."""

import os
import shutil
import tempfile
from pathlib import Path

DEFAULT_WORKSPACE_ROOT = Path(
    os.getenv(
        "DOCPILOT_WORKSPACE_ROOT",
        os.getenv(
            "JOB_WORKSPACE_ROOT",
            str(Path(tempfile.gettempdir()) / "docpilot_storage" / "job_workspaces"),
        ),
    )
)


class JobWorkspace:
    """Manage temporary repository workspaces for jobs."""

    def __init__(self, root: Path | None = None) -> None:
        """Initialize the workspace manager."""
        self.root = (
            root
            if root is not None
            else DEFAULT_WORKSPACE_ROOT
        )
        self.root.mkdir(parents=True, exist_ok=True)

    def create(self, job_id: str) -> Path:
        """Create and return a workspace for a job."""
        workspace = self.root / job_id
        workspace.mkdir(parents=True, exist_ok=False)
        return workspace

    def cleanup(self, job_id: str) -> None:
        """Remove a job workspace."""
        workspace = self.root / job_id

        if workspace.exists():
            shutil.rmtree(workspace)
