"""Tests for GitHub repository download and storage in backend."""

import io
from pathlib import Path
from unittest.mock import AsyncMock, patch
from zipfile import ZipFile

import pytest
import httpx

from services.github_service import download_github_repository
from services.projects.project_storage import ProjectStorage


def make_github_zip_bytes() -> bytes:
    """Create a simulated GitHub zipball with a single root directory."""
    buf = io.BytesIO()
    with ZipFile(buf, "w") as z:
        z.writestr("octocat-repo-abc1234/src/main.py", "def run():\n    pass\n")
        z.writestr("octocat-repo-abc1234/README.md", "# Test Repo\n")
    return buf.getvalue()


@pytest.mark.anyio
async def test_download_github_repository_extracts_and_flattens(tmp_path: Path):
    """Verify download_github_repository extracts and flattens GitHub's root directory."""
    zip_bytes = make_github_zip_bytes()

    mock_resp = httpx.Response(
        status_code=200,
        content=zip_bytes,
        headers={"content-type": "application/zip"},
        request=httpx.Request("GET", "https://api.github.com/repos/test/repo/zipball"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        dest = tmp_path / "storage"
        await download_github_repository(
            owner="test",
            repo="repo",
            destination=dest,
            access_token="fake_token",
        )

        assert dest.exists()
        assert (dest / "README.md").is_file()
        assert (dest / "src" / "main.py").is_file()
        assert (dest / "README.md").read_text() == "# Test Repo\n"
