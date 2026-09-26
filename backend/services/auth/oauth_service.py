import secrets

import httpx
from urllib.parse import urlencode

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.settings import settings
from database.models import User, UserIdentity
from utils.jwt import create_access_token


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

MICROSOFT_AUTHORIZE_URL = (
    "https://login.microsoftonline.com/"
    "{tenant}/oauth2/v2.0/authorize"
)
MICROSOFT_TOKEN_URL = (
    "https://login.microsoftonline.com/"
    "{tenant}/oauth2/v2.0/token"
)
MICROSOFT_USERINFO_URL = "https://graph.microsoft.com/v1.0/me"


def generate_oauth_state() -> str:
    return secrets.token_urlsafe(32)


def get_google_authorization_url(state: str) -> str:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def get_microsoft_authorization_url(
    state: str,
    redirect_uri: str | None = None,
) -> str:
    tenant = getattr(settings, "MICROSOFT_TENANT", "common")

    params = {
        "client_id": settings.MICROSOFT_CLIENT_ID,
        "redirect_uri": redirect_uri or settings.MICROSOFT_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid profile email User.Read",
        "response_mode": "query",
        "state": state,
    }

    base_url = MICROSOFT_AUTHORIZE_URL.format(tenant=tenant)
    return f"{base_url}?{urlencode(params)}"

async def _google_identity_from_code(code: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            },
        )

        if token_response.status_code != 200:
            raise ValueError("Google token exchange failed")

        access_token = token_response.json().get("access_token")

        if not access_token:
            raise ValueError("Google access token not received")

        response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if response.status_code != 200:
            raise ValueError("Could not get Google user information")

        google_user = response.json()

    google_id = google_user.get("sub")
    email = google_user.get("email")
    name = google_user.get("name")
    email_verified = google_user.get("email_verified")

    if not google_id:
        raise ValueError("Invalid Google account")

    if not email:
        raise ValueError("Google email not available")

    if email_verified is not True:
        raise ValueError("Google email is not verified")

    return {
        "provider_id": google_id,
        "email": email.strip().lower(),
        "name": name or "Google User",
    }


async def _microsoft_identity_from_code(
    code: str,
    redirect_uri: str | None = None,
) -> dict:
    tenant = getattr(settings, "MICROSOFT_TENANT", "common")
    token_url = MICROSOFT_TOKEN_URL.format(tenant=tenant)

    redirect_uri = redirect_uri or settings.MICROSOFT_REDIRECT_URI

    async with httpx.AsyncClient(timeout=15.0) as client:
        token_response = await client.post(
            token_url,
            data={
                "client_id": settings.MICROSOFT_CLIENT_ID,
                "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
                "scope": "openid profile email User.Read",
            },
        )

        if token_response.status_code != 200:
            raise ValueError("Microsoft token exchange failed")

        access_token = token_response.json().get("access_token")

        if not access_token:
            raise ValueError("Microsoft access token not received")

        response = await client.get(
            MICROSOFT_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if response.status_code != 200:
            raise ValueError("Could not get Microsoft user information")

        microsoft_user = response.json()

    microsoft_id = microsoft_user.get("id")
    email = (
        microsoft_user.get("mail")
        or microsoft_user.get("userPrincipalName")
    )
    name = microsoft_user.get("displayName")

    if not microsoft_id:
        raise ValueError("Invalid Microsoft account")

    if not email:
        raise ValueError("Microsoft email not available")

    return {
        "provider_id": microsoft_id,
        "email": email.strip().lower(),
        "name": name or "Microsoft User",
    }


def _app_token(user: User) -> str:
    return create_access_token(
        {
            "sub": str(user.id),
            "email": user.email,
        }
    )


async def google_login(db: AsyncSession, code: str):
    google = await _google_identity_from_code(code)

    result = await db.execute(
        select(UserIdentity).where(
            UserIdentity.provider == "google",
            UserIdentity.provider_id == google["provider_id"],
        )
    )
    identity = result.scalar_one_or_none()

    if identity:
        result = await db.execute(
            select(User).where(User.id == identity.user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise ValueError("Linked user account not found")

        if not user.is_active:
            raise ValueError("User account is inactive")

        user.is_verified = True
        await db.commit()
        await db.refresh(user)

        return user, _app_token(user)

    # Existing account with same verified Google email is linked.
    result = await db.execute(
        select(User).where(User.email == google["email"])
    )
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            name=google["name"],
            email=google["email"],
            password_hash=None,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
    else:
        if not user.is_active:
            raise ValueError("User account is inactive")
        user.is_verified = True

    identity = UserIdentity(
        user_id=user.id,
        provider="google",
        provider_id=google["provider_id"],
    )
    db.add(identity)

    await db.commit()
    await db.refresh(user)

    return user, _app_token(user)


async def microsoft_login(db: AsyncSession, code: str):
    microsoft = await _microsoft_identity_from_code(code)

    result = await db.execute(
        select(UserIdentity).where(
            UserIdentity.provider == "microsoft",
            UserIdentity.provider_id == microsoft["provider_id"],
        )
    )
    identity = result.scalar_one_or_none()

    if identity:
        result = await db.execute(
            select(User).where(User.id == identity.user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise ValueError("Linked user account not found")

        if not user.is_active:
            raise ValueError("User account is inactive")

        user.is_verified = True
        await db.commit()
        await db.refresh(user)

        return user, _app_token(user)

    result = await db.execute(
        select(User).where(User.email == microsoft["email"])
    )
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            name=microsoft["name"],
            email=microsoft["email"],
            password_hash=None,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
    else:
        if not user.is_active:
            raise ValueError("User account is inactive")
        user.is_verified = True

    identity = UserIdentity(
        user_id=user.id,
        provider="microsoft",
        provider_id=microsoft["provider_id"],
    )
    db.add(identity)

    await db.commit()
    await db.refresh(user)

    return user, _app_token(user)

