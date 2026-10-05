"""Tests for repository upload API."""

from pathlib import Path
from unittest.mock import AsyncMock, patch
from zipfile import ZipFile

import pytest
from fastapi.testclient import TestClient

from database.models import User
from main import app
from routes.jobs.upload import get_upload_user


@pytest.fixture(autouse=True)
def mock_job_worker_run():
    """Mock the background worker so unit tests do not spawn background AI pipelines."""
    with patch("backend.routes.jobs.upload.JobWorker.run", new_callable=AsyncMock) as mock_run:
        yield mock_run


@pytest.fixture
def fake_user():
    return User(
        id=1,
        name="Test User",
        email="test@example.com",
        is_active=True,
        is_verified=True,
    )


@pytest.fixture
def client():
    """Create a TestClient that properly manages lifespan."""
    with TestClient(app) as test_client:
        yield test_client


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


def create_nested_zip(path: Path) -> None:
    """Create a ZIP with nested folders."""
    with ZipFile(path, "w") as archive:
        archive.writestr(
            "src/utils/helpers.py",
            "def add(a, b):\n    return a + b\n",
        )
        archive.writestr(
            "tests/test_helpers.py",
            "from src.utils.helpers import add\ndef test_add(): assert add(1, 2) == 3\n",
        )
        archive.writestr(
            "README.md",
            "# Nested Repository\n",
        )


def test_upload_repository(tmp_path: Path, client: TestClient, fake_user: User) -> None:
    """A valid repository ZIP with authentication should create a job."""
    app.dependency_overrides[get_upload_user] = lambda: fake_user
    try:
        archive_path = tmp_path / "sample_repository.zip"
        create_zip(archive_path)

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
    finally:
        app.dependency_overrides.pop(get_upload_user, None)


def test_upload_rejects_unauthenticated(client: TestClient) -> None:
    """Unauthenticated uploads should be rejected with 401."""
    # Ensure no override is active
    app.dependency_overrides.pop(get_upload_user, None)

    response = client.post(
        "/api/jobs/upload",
        files={
            "repository": (
                "sample.zip",
                b"fake zip data",
                "application/zip",
            )
        },
    )

    assert response.status_code == 401
    assert "detail" in response.json()


def test_upload_rejects_non_zip(client: TestClient, fake_user: User) -> None:
    """Non-ZIP repository uploads should be rejected."""
    app.dependency_overrides[get_upload_user] = lambda: fake_user
    try:
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
    finally:
        app.dependency_overrides.pop(get_upload_user, None)


def test_upload_preserves_nested_structure(tmp_path: Path, client: TestClient, fake_user: User) -> None:
    """Uploaded ZIP with nested folders should extract and preserve structure."""
    app.dependency_overrides[get_upload_user] = lambda: fake_user
    try:
        archive_path = tmp_path / "nested_repo.zip"
        create_nested_zip(archive_path)

        with archive_path.open("rb") as archive:
            response = client.post(
                "/api/jobs/upload",
                files={
                    "repository": (
                        "nested_repo.zip",
                        archive,
                        "application/zip",
                    )
                },
                data={
                    "repository_name": "nested-repo",
                },
            )

        assert response.status_code == 201
        data = response.json()
        assert data["job_id"]
    finally:
        app.dependency_overrides.pop(get_upload_user, None)


def test_upload_oversized_rejected(tmp_path: Path, client: TestClient, fake_user: User) -> None:
    """Oversized repository ZIP (> 50MB) should be rejected with 413."""
    app.dependency_overrides[get_upload_user] = lambda: fake_user
    try:
        # Create a mock large file without actually writing 50MB to disk
        from services.repositories.repository_service import MAX_ARCHIVE_BYTES

        fake_oversized = b"0" * (MAX_ARCHIVE_BYTES + 1024)
        response = client.post(
            "/api/jobs/upload",
            files={
                "repository": (
                    "large.zip",
                    fake_oversized,
                    "application/zip",
                )
            },
            data={
                "repository_name": "large-repo",
            },
        )

        assert response.status_code == 413
        assert "maximum allowed size" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(get_upload_user, None)
