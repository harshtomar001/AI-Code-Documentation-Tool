from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
import base64
from database.database import get_db
from database.models import GitHubConnection, User, UserIdentity
from routes.auth.auth import get_current_user
from services.auth.oauth_service import (
    generate_oauth_state,
    get_github_authorization_url,
)

router = APIRouter(
    prefix="/api/github",
    tags=["GitHub"],
)


# =========================================================
# CONNECT GITHUB
# =========================================================

@router.get("/connect")
async def connect_github(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    state = generate_oauth_state()

    request.session["github_connect_state"] = state
    request.session["github_connect_user_id"] = current_user.id

    return {
        "url": get_github_authorization_url(state)
    }


# =========================================================
# GITHUB STATUS
# =========================================================

@router.get("/status")
async def github_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GitHubConnection).where(
            GitHubConnection.user_id == current_user.id
        )
    )

    connection = result.scalar_one_or_none()

    return {
        "connected": bool(connection),
        "username": (
            connection.github_username
            if connection
            else None
        ),
        "repository_count": None,
    }


# =========================================================
# GITHUB REPOSITORIES
# =========================================================

@router.get("/repositories")
async def github_repositories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GitHubConnection).where(
            GitHubConnection.user_id == current_user.id
        )
    )

    connection = result.scalar_one_or_none()

    if not connection:
        return {
            "connected": False,
            "repositories": [],
        }

    headers = {
        "Authorization": f"Bearer {connection.access_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    try:
        repositories = []

        async with httpx.AsyncClient(timeout=20.0) as client:

            for page in range(1, 101):

                response = await client.get(
                    "https://api.github.com/user/repos",
                    params={
                        "visibility": "all",
                        "affiliation": (
                            "owner,collaborator,"
                            "organization_member"
                        ),
                        "sort": "updated",
                        "direction": "desc",
                        "per_page": 100,
                        "page": page,
                    },
                    headers=headers,
                )

                # Token expired / revoked
                if response.status_code == 401:
                    return {
                        "connected": False,
                        "repositories": [],
                        "error": (
                            "GitHub authorization expired. "
                            "Please reconnect GitHub."
                        ),
                    }

                response.raise_for_status()

                page_data = response.json()

                repositories.extend(page_data)

                if len(page_data) < 100:
                    break

        return {
            "connected": True,
            "repositories": [
                {
                    "id": repo["id"],
                    "name": repo["name"],
                    "full_name": repo["full_name"],
                    "private": repo["private"],
                    "html_url": repo["html_url"],
                    "description": repo.get("description"),
                    "language": repo.get("language"),
                    "updated_at": repo.get("updated_at"),
                    "owner": repo.get("owner", {}).get("login"),
                }
                for repo in repositories
            ],
        }

    except httpx.HTTPError as error:

        print(
            "GitHub repository fetch error:",
            error,
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Could not fetch repositories "
                "from GitHub"
            ),
        )


# =========================================================
# DISCONNECT GITHUB
# =========================================================

@router.post("/disconnect")
async def disconnect_github(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Delete GitHub connection
    result = await db.execute(
        select(GitHubConnection).where(
            GitHubConnection.user_id == current_user.id
        )
    )

    connection = result.scalar_one_or_none()

    if connection:
        await db.delete(connection)

    # Delete GitHub identity if it exists
    result = await db.execute(
        select(UserIdentity).where(
            UserIdentity.user_id == current_user.id,
            UserIdentity.provider == "github",
        )
    )

    identity = result.scalar_one_or_none()

    if identity:
        await db.delete(identity)

    await db.commit()

    return {
        "message": "GitHub disconnected",
        "connected": False,
    }

# =========================================================
# GET SINGLE GITHUB REPOSITORY
# =========================================================

@router.get("/repositories/{owner}/{repo}")
async def get_github_repository(
    owner: str,
    repo: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # -----------------------------------------------------
    # Get connected GitHub account
    # -----------------------------------------------------

    result = await db.execute(
        select(GitHubConnection).where(
            GitHubConnection.user_id == current_user.id
        )
    )

    connection = result.scalar_one_or_none()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub is not connected",
        )

    headers = {
        "Authorization": f"Bearer {connection.access_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    try:
        async with httpx.AsyncClient(
            timeout=30.0
        ) as client:

            # =================================================
            # REPOSITORY DETAILS
            # =================================================

            repo_response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}",
                headers=headers,
            )

            if repo_response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="GitHub authorization expired. Please reconnect GitHub.",
                )

            if repo_response.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Repository not found or you do not have access to it.",
                )

            repo_response.raise_for_status()

            repo_data = repo_response.json()

            default_branch = repo_data.get(
                "default_branch"
            )

            # =================================================
            # FILE TREE
            # =================================================

            tree_response = await client.get(
                f"https://api.github.com/repos/"
                f"{owner}/{repo}/git/trees/"
                f"{default_branch}",
                params={
                    "recursive": "1"
                },
                headers=headers,
            )

            tree_response.raise_for_status()

            tree_data = tree_response.json()

            tree = tree_data.get("tree", [])

            files = [
                {
                    "path": item.get("path"),
                    "type": item.get("type"),
                    "size": item.get("size", 0),
                    "sha": item.get("sha"),
                }
                for item in tree
            ]

            # =================================================
            # README
            # =================================================

            readme = None

            readme_response = await client.get(
                f"https://api.github.com/repos/"
                f"{owner}/{repo}/readme",
                headers=headers,
            )

            if readme_response.status_code == 200:
                readme_data = readme_response.json()

                encoded_content = readme_data.get(
                    "content"
                )

                if encoded_content:
                    try:
                        readme_content = base64.b64decode(
                            encoded_content
                        ).decode(
                            "utf-8",
                            errors="replace",
                        )

                        readme = {
                            "name": readme_data.get(
                                "name"
                            ),
                            "path": readme_data.get(
                                "path"
                            ),
                            "content": readme_content,
                        }

                    except Exception:
                        readme = None

            # =================================================
            # RECENT COMMITS
            # =================================================

            commits_response = await client.get(
                f"https://api.github.com/repos/"
                f"{owner}/{repo}/commits",
                params={
                    "per_page": 5,
                },
                headers=headers,
            )

            commits_response.raise_for_status()

            commits_data = commits_response.json()

            commits = []

            for commit in commits_data:
                commit_info = commit.get(
                    "commit",
                    {}
                )

                author_info = commit_info.get(
                    "author",
                    {}
                )

                commits.append(
                    {
                        "sha": commit.get("sha"),
                        "message": (
                            commit_info.get(
                                "message"
                            )
                            or ""
                        ).split("\n")[0],
                        "author": (
                            author_info.get(
                                "name"
                            )
                            or commit.get(
                                "author",
                                {}
                            ).get("login")
                            or "Unknown"
                        ),
                        "date": author_info.get(
                            "date"
                        ),
                        "html_url": commit.get(
                            "html_url"
                        ),
                    }
                )

        return {
            "repository": {
                "id": repo_data.get("id"),
                "name": repo_data.get("name"),
                "full_name": repo_data.get(
                    "full_name"
                ),
                "owner": repo_data.get(
                    "owner",
                    {}
                ).get("login"),
                "description": repo_data.get(
                    "description"
                ),
                "private": repo_data.get(
                    "private"
                ),
                "html_url": repo_data.get(
                    "html_url"
                ),
                "default_branch": default_branch,
                "language": repo_data.get(
                    "language"
                ),
                "stars": repo_data.get(
                    "stargazers_count",
                    0,
                ),
                "forks": repo_data.get(
                    "forks_count",
                    0,
                ),
                "open_issues": repo_data.get(
                    "open_issues_count",
                    0,
                ),
                "watchers": repo_data.get(
                    "watchers_count",
                    0,
                ),
                "size": repo_data.get(
                    "size",
                    0,
                ),
                "created_at": repo_data.get(
                    "created_at"
                ),
                "updated_at": repo_data.get(
                    "updated_at"
                ),
                "pushed_at": repo_data.get(
                    "pushed_at"
                ),
                "license": (
                    repo_data.get(
                        "license"
                    ) or {}
                ).get("spdx_id"),
            },
            "files": files,
            "tree_truncated": tree_data.get(
                "truncated",
                False,
            ),
            "readme": readme,
            "commits": commits,
        }

    except HTTPException:
        raise

    except httpx.HTTPError as error:
        print(
            "GitHub repository API error:",
            error,
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not fetch repository data from GitHub",
        )


# =========================================================
# GET SINGLE FILE CONTENT
# =========================================================

@router.get(
    "/repositories/{owner}/{repo}/file"
)
async def get_github_file(
    owner: str,
    repo: str,
    path: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # -----------------------------------------------------
    # Get connected GitHub account
    # -----------------------------------------------------

    result = await db.execute(
        select(GitHubConnection).where(
            GitHubConnection.user_id == current_user.id
        )
    )

    connection = result.scalar_one_or_none()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub is not connected",
        )

    headers = {
        "Authorization": f"Bearer {connection.access_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    try:
        async with httpx.AsyncClient(
            timeout=30.0
        ) as client:

            response = await client.get(
                f"https://api.github.com/repos/"
                f"{owner}/{repo}/contents/"
                f"{path}",
                headers=headers,
            )

            if response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="GitHub authorization expired.",
                )

            if response.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="File not found.",
                )

            response.raise_for_status()

            data = response.json()

            # Directory clicked accidentally
            if isinstance(data, list):
                return {
                    "type": "directory",
                    "path": path,
                    "content": None,
                }

            encoded_content = data.get(
                "content"
            )

            if not encoded_content:
                return {
                    "type": data.get("type"),
                    "path": data.get("path"),
                    "content": None,
                    "message": "GitHub did not return file content.",
                }

            content = base64.b64decode(
                encoded_content
            ).decode(
                "utf-8",
                errors="replace",
            )

            return {
                "type": "file",
                "path": data.get("path"),
                "name": data.get("name"),
                "size": data.get("size"),
                "sha": data.get("sha"),
                "content": content,
            }

    except HTTPException:
        raise

    except httpx.HTTPError as error:
        print(
            "GitHub file API error:",
            error,
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not fetch file from GitHub",
        )