import os
import shutil
import tempfile
from pathlib import Path

DEFAULT_STORAGE_ROOT = Path(
    os.getenv(
        "DOCPILOT_PROJECT_STORAGE_ROOT",
        os.getenv(
            "PROJECT_STORAGE_ROOT",
            str(Path(tempfile.gettempdir()) / "docpilot_storage" / "project_storage"),
        ),
    )
)

MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_TOTAL_BYTES = 200 * 1024 * 1024
MAX_FILE_COUNT = 10_000


class ProjectStorageError(ValueError):
    """Raised when project file storage validation fails."""


class ProjectStorage:
    """Store and retrieve files belonging to persistent projects."""

    def __init__(self, root: Path | None = None) -> None:
        self.root = (
            root
            if root is not None
            else DEFAULT_STORAGE_ROOT
        )
        self.root.mkdir(parents=True, exist_ok=True)

    def project_root(self, project_id: str) -> Path:
        """Return the storage directory for a project."""
        project_root = (self.root / str(project_id)).resolve()

        if not self._is_inside(self.root.resolve(), project_root):
            raise ProjectStorageError("Invalid project storage path")

        return project_root

    def clear_project(self, project_id: str) -> None:
        """Remove all stored files for a project."""
        project_root = self.project_root(project_id)

        if project_root.exists():
            shutil.rmtree(project_root)

    @staticmethod
    def safe_relative_path(relative_path: str) -> Path:
        """Validate and normalize a browser-provided relative path."""
        if not relative_path:
            raise ProjectStorageError("File path is required")

        path = Path(relative_path.replace("\\", "/"))

        if path.is_absolute():
            raise ProjectStorageError("Absolute file paths are not allowed")

        if any(part in ("", ".", "..") for part in path.parts):
            raise ProjectStorageError("Unsafe file path")

        return path

    @staticmethod
    def _is_inside(root: Path, candidate: Path) -> bool:
        """Return whether candidate is contained inside root."""
        try:
            candidate.relative_to(root)
            return True
        except ValueError:
            return False
