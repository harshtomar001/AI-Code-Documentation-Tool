import shutil
import tempfile
from pathlib import Path
import httpx

from services.repositories.repository_service import (
    RepositoryService,
    RepositoryUploadError,
    MAX_ARCHIVE_BYTES,
)

GITHUB_API = "https://api.github.com"


async def get_github_user(access_token: str):
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GITHUB_API}/user",
            headers=headers
        )

    response.raise_for_status()
    return response.json()


async def get_repositories(access_token: str):
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
    }

    repositories = []
    page = 1

    async with httpx.AsyncClient() as client:
        while True:
            response = await client.get(
                f"{GITHUB_API}/user/repos",
                headers=headers,
                params={
                    "per_page": 100,
                    "page": page,
                    "sort": "updated",
                },
            )

            response.raise_for_status()

            data = response.json()

            if not data:
                break

            repositories.extend(data)

            if len(data) < 100:
                break

            page += 1

    return repositories


async def download_github_repository(
    owner: str,
    repo: str,
    destination: Path,
    access_token: str | None = None,
) -> Path:
    """Download a GitHub repository archive and extract files into destination."""
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "DocuAI",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    zipball_url = f"{GITHUB_API}/repos/{owner}/{repo}/zipball"

    async with httpx.AsyncClient(follow_redirects=True, timeout=120.0) as client:
        response = await client.get(zipball_url, headers=headers)

    if response.status_code in (401, 403):
        raise ValueError(
            "GitHub authentication required or permission denied for this repository."
        )
    if response.status_code == 404:
        raise ValueError(
            f"GitHub repository '{owner}/{repo}' not found or inaccessible."
        )
    if response.status_code != 200:
        raise ValueError(
            f"Failed to download repository from GitHub (HTTP {response.status_code})."
        )

    content = response.content
    if len(content) > MAX_ARCHIVE_BYTES:
        raise RepositoryUploadError(
            "Repository archive exceeds the maximum allowed size (50MB)."
        )

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_zip = Path(temp_dir) / "archive.zip"
        temp_zip.write_bytes(content)

        temp_extract = Path(temp_dir) / "extracted"
        repo_service = RepositoryService()
        repo_service.extract_zip(temp_zip, temp_extract)

        destination = destination.resolve()
        destination.mkdir(parents=True, exist_ok=True)

        items = list(temp_extract.iterdir())
        source_dir = (
            items[0]
            if len(items) == 1 and items[0].is_dir()
            else temp_extract
        )

        for item in source_dir.iterdir():
            target_item = destination / item.name
            if item.is_dir():
                shutil.copytree(item, target_item, dirs_exist_ok=True)
            else:
                shutil.copy2(item, target_item)

    return destination