"""Tests for job workspaces."""

from pathlib import Path

from backend.services.repositories.workspace import JobWorkspace


def test_create_workspace(tmp_path: Path) -> None:
    """A workspace should be created for a job."""
    manager = JobWorkspace(tmp_path)

    workspace = manager.create("job-123")

    assert workspace == tmp_path / "job-123"
    assert workspace.is_dir()


def test_cleanup_workspace(tmp_path: Path) -> None:
    """Cleanup should remove the entire job workspace."""
    manager = JobWorkspace(tmp_path)

    workspace = manager.create("job-123")
    (workspace / "repository").mkdir()
    (workspace / "repository" / "main.py").write_text(
        "print('hello')",
        encoding="utf-8",
    )

    manager.cleanup("job-123")

    assert not workspace.exists()


def test_cleanup_missing_workspace_is_safe(tmp_path: Path) -> None:
    """Cleaning an unknown job should be harmless."""
    manager = JobWorkspace(tmp_path)

    manager.cleanup("missing-job")
