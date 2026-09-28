"""Tests for repository upload API."""

from pathlib import Path
from zipfile import ZipFile

from fastapi.testclient import TestClient

from backend.main import app


def create_zip(path: Path) -> None:
    """Create a small valid repository ZIP."""
    with ZipFile(path, "w") as archive:
        archive.writestr(
            "main.py",
            "def hello():\n    return 'hello'\n",
        )
        archive.writestr(
            "README.md",
            "# Test Repository\n",
        )


def test_upload_repository(tmp_path: Path) -> None:
    """A valid repository ZIP should create a job."""
    archive_path = tmp_path / "sample_repository.zip"
    create_zip(archive_path)

    client = TestClient(app)

    with archive_path.open("rb") as archive:
        response = client.post(
            "/api/jobs/upload",
            files={
                "repository": (
                    "sample_repository.zip",
                    archive,
                    "application/zip",
                )
            },
            data={
                "repository_name": "test-repository",
            },
        )

    assert response.status_code == 201

    data = response.json()

    assert data["job_id"]
    assert data["status"] == "queued"
    assert data["message"] == "Job queued"


def test_upload_rejects_non_zip() -> None:
    """Non-ZIP repository uploads should be rejected."""
    client = TestClient(app)

    response = client.post(
        "/api/jobs/upload",
        files={
            "repository": (
                "repository.txt",
                b"not a zip",
                "text/plain",
            )
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Repository must be a ZIP archive"
