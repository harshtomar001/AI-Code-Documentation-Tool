"""Tests for project file listing and content retrieval with batch docstrings and generated README."""

import uuid
from unittest.mock import AsyncMock, MagicMock
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from database.database import get_db
from database.models import DocumentationBatch, Project, User
from main import app
from routes.auth.auth import get_current_user
from services.projects.project_storage import ProjectStorage


@pytest.fixture
def fake_user():
    return User(
        id=42,
        name="Test Dev",
        email="dev@example.com",
        is_active=True,
        is_verified=True,
    )


@pytest.fixture
def fake_project():
    proj_id = uuid.uuid4()
    return Project(
        id=proj_id,
        user_id=42,
        name="test-repo",
        source_type="upload",
        status="completed",
    )


def test_get_project_files_injects_generated_readme(fake_user, fake_project, tmp_path):
    storage = ProjectStorage(root=tmp_path)
    proj_root = storage.project_root(str(fake_project.id))
    proj_root.mkdir(parents=True, exist_ok=True)
    (proj_root / "main.py").write_text("def run(): pass\n", encoding="utf-8")

    batch = DocumentationBatch(
        id=1,
        project_id=fake_project.id,
        batch_id=1,
        total_batches=1,
        status="completed",
        files=["main.py"],
        changes=[],
        readme="# Generated Documentation README\n\nFull details here.",
    )

    mock_db = AsyncMock()
    
    async def mock_execute(stmt):
        stmt_str = str(stmt)
        result = MagicMock()
        if "FROM projects" in stmt_str or "FROM \"projects\"" in stmt_str or "projects." in stmt_str:
            result.scalar_one_or_none.return_value = fake_project
        elif "documentation_batches" in stmt_str:
            result.scalars.return_value.all.return_value = [batch]
        else:
            result.scalar_one_or_none.return_value = None
            result.scalars.return_value.all.return_value = []
        return result

    mock_db.execute = AsyncMock(side_effect=mock_execute)

    app.dependency_overrides[get_current_user] = lambda: fake_user
    app.dependency_overrides[get_db] = lambda: mock_db

    with patch_storage(storage):
        with TestClient(app) as client:
            resp = client.get(f"/api/projects/{fake_project.id}/files")
            assert resp.status_code == 200
            data = resp.json()
            paths = [f["path"] for f in data["files"]]
            assert "README.md" in paths
            readme_file = next(f for f in data["files"] if f["path"] == "README.md")
            assert readme_file.get("is_generated") is True

    app.dependency_overrides.clear()


def test_get_project_file_content_returns_generated_readme(fake_user, fake_project, tmp_path):
    storage = ProjectStorage(root=tmp_path)
    proj_root = storage.project_root(str(fake_project.id))
    proj_root.mkdir(parents=True, exist_ok=True)

    batch = DocumentationBatch(
        id=1,
        project_id=fake_project.id,
        batch_id=1,
        total_batches=1,
        status="completed",
        files=["main.py"],
        changes=[],
        readme="# Generated Documentation README\n\nFull details here.",
    )

    mock_db = AsyncMock()
    async def mock_execute(stmt):
        stmt_str = str(stmt)
        result = MagicMock()
        if "FROM projects" in stmt_str or "projects." in stmt_str:
            result.scalar_one_or_none.return_value = fake_project
        elif "documentation_batches" in stmt_str:
            result.scalars.return_value.all.return_value = [batch]
        return result

    mock_db.execute = AsyncMock(side_effect=mock_execute)

    app.dependency_overrides[get_current_user] = lambda: fake_user
    app.dependency_overrides[get_db] = lambda: mock_db

    with patch_storage(storage):
        with TestClient(app) as client:
            resp = client.get(f"/api/projects/{fake_project.id}/files/content?path=README.md")
            assert resp.status_code == 200
            assert "Generated Documentation README" in resp.text

    app.dependency_overrides.clear()


def test_get_project_file_content_applies_docstring_changes(fake_user, fake_project, tmp_path):
    storage = ProjectStorage(root=tmp_path)
    proj_root = storage.project_root(str(fake_project.id))
    proj_root.mkdir(parents=True, exist_ok=True)

    original_code = "def calculate(x, y):\n    return x + y\n"
    (proj_root / "math_utils.py").write_text(original_code, encoding="utf-8")

    documented_code = 'def calculate(x, y):\n    """Add two numbers together."""\n    return x + y\n'

    batch = DocumentationBatch(
        id=1,
        project_id=fake_project.id,
        batch_id=1,
        total_batches=1,
        status="completed",
        files=["math_utils.py"],
        changes=[
            {
                "file": "math_utils.py",
                "before": original_code,
                "after": documented_code,
            }
        ],
        readme=None,
    )

    mock_db = AsyncMock()
    async def mock_execute(stmt):
        stmt_str = str(stmt)
        result = MagicMock()
        if "FROM projects" in stmt_str or "projects." in stmt_str:
            result.scalar_one_or_none.return_value = fake_project
        elif "documentation_batches" in stmt_str:
            result.scalars.return_value.all.return_value = [batch]
        return result

    mock_db.execute = AsyncMock(side_effect=mock_execute)

    app.dependency_overrides[get_current_user] = lambda: fake_user
    app.dependency_overrides[get_db] = lambda: mock_db

    with patch_storage(storage):
        with TestClient(app) as client:
            resp = client.get(f"/api/projects/{fake_project.id}/files/content?path=math_utils.py")
            assert resp.status_code == 200
            assert '"""Add two numbers together."""' in resp.text

    app.dependency_overrides.clear()


def test_get_project_file_content_resolves_nested_wrapper_folder(fake_user, fake_project, tmp_path):
    storage = ProjectStorage(root=tmp_path)
    proj_root = storage.project_root(str(fake_project.id))
    # Simulate extraction inside a wrapper directory like my-repo/src/core.py
    nested_dir = proj_root / "my-repo" / "src"
    nested_dir.mkdir(parents=True, exist_ok=True)
    (nested_dir / "core.py").write_text("def process(): pass\n", encoding="utf-8")

    mock_db = AsyncMock()
    async def mock_execute(stmt):
        stmt_str = str(stmt)
        result = MagicMock()
        if "FROM projects" in stmt_str or "projects." in stmt_str:
            result.scalar_one_or_none.return_value = fake_project
        elif "documentation_batches" in stmt_str:
            result.scalars.return_value.all.return_value = []
        return result

    mock_db.execute = AsyncMock(side_effect=mock_execute)

    app.dependency_overrides[get_current_user] = lambda: fake_user
    app.dependency_overrides[get_db] = lambda: mock_db

    with patch_storage(storage):
        with TestClient(app) as client:
            resp = client.get(f"/api/projects/{fake_project.id}/files/content?path=src/core.py")
            assert resp.status_code == 200
            assert "def process(): pass" in resp.text

    app.dependency_overrides.clear()


def patch_storage(storage_instance):
    from unittest.mock import patch
    return patch("routes.project_files.project_storage", storage_instance)
