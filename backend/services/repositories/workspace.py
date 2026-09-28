"""Persistent workspaces for documentation jobs."""

import shutil
from pathlib import Path


class JobWorkspace:
    """Manage temporary repository workspaces for jobs."""

    def __init__(self, root: Path | None = None) -> None:
        """Initialize the workspace manager."""
        self.root = root if root is not None else Path.cwd() / ".job_workspaces"
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
