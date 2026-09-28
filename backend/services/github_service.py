import httpx


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