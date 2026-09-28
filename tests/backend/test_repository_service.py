"""Tests for secure repository archive handling."""

from pathlib import Path
from zipfile import ZipFile

import pytest

from backend.services.repositories.repository_service import (
    MAX_ARCHIVE_BYTES,
    RepositoryService,
    RepositoryUploadError,
)


def create_zip(
    path: Path,
    files: dict[str, str],
) -> None:
    """Create a ZIP archive containing the supplied files."""
    with ZipFile(path, "w") as archive:
        for name, content in files.items():
            archive.writestr(name, content)


def test_extracts_valid_repository(tmp_path: Path) -> None:
    """A valid repository archive should be extracted."""
    archive = tmp_path / "sample_repository.zip"
    destination = tmp_path / "repository"

    create_zip(
        archive,
        {
            "main.py": "print('hello')",
            "src/utils.py": "def helper(): pass",
        },
    )

    result = RepositoryService().extract_zip(
        archive,
        destination,
    )

    assert result == destination.resolve()
    assert (destination / "main.py").read_text() == "print('hello')"
    assert (destination / "src" / "utils.py").exists()


def test_rejects_path_traversal(tmp_path: Path) -> None:
    """Archives containing parent traversal paths should be rejected."""
    archive = tmp_path / "malicious.zip"
    destination = tmp_path / "repository"

    create_zip(
        archive,
        {
            "../../outside.txt": "malicious",
        },
    )

    with pytest.raises(RepositoryUploadError):
        RepositoryService().extract_zip(
            archive,
            destination,
        )


def test_rejects_absolute_path(tmp_path: Path) -> None:
    """Archives containing absolute paths should be rejected."""
    archive = tmp_path / "malicious.zip"
    destination = tmp_path / "repository"

    create_zip(
        archive,
        {
            "/absolute.txt": "malicious",
        },
    )

    with pytest.raises(RepositoryUploadError):
        RepositoryService().extract_zip(
            archive,
            destination,
        )


def test_rejects_missing_archive(tmp_path: Path) -> None:
    """A missing archive should be rejected."""
    with pytest.raises(RepositoryUploadError):
        RepositoryService().extract_zip(
            tmp_path / "missing.zip",
            tmp_path / "repository",
        )


def test_rejects_oversized_archive(tmp_path: Path) -> None:
    """Archives larger than the upload limit should be rejected."""
    archive = tmp_path / "large.zip"
    archive.write_bytes(b"x" * (MAX_ARCHIVE_BYTES + 1))

    with pytest.raises(RepositoryUploadError):
        RepositoryService().extract_zip(
            archive,
            tmp_path / "repository",
        )
