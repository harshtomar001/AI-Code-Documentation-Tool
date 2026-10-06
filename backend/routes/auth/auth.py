import secrets
from urllib.parse import quote
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from config.settings import settings
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.database import get_db
from database.models import User, UserIdentity

from schemas.auth.auth import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    VerifyEmailRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ResendOTPRequest,
    ResendResetOTPRequest,
    UpdateProfileRequest,
    ChangePasswordRequest,
)
from utils.security import hash_password, verify_password

from services.auth.auth_service import (
    register_user,
    verify_email,
    resend_otp,
    login_user,
    forgot_password,
    resend_reset_otp,
    reset_password,
)

from services.auth.oauth_service import (
    generate_oauth_state,

    get_google_authorization_url,
    google_login,

    get_microsoft_authorization_url,
    microsoft_login,

    get_github_authorization_url,
    github_login,
    github_connect,
)

from utils.jwt import verify_access_token


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)

security = HTTPBearer()


# =========================================================
# REGISTER
# =========================================================

@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await register_user(db, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# =========================================================
# VERIFY EMAIL
# =========================================================
@router.post(
    "/verify-email",
    response_model=AuthResponse,
)
async def verify_email_endpoint(
    data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        user, access_token = await verify_email(
            db,
            data.email,
            data.otp,
        )

        return AuthResponse(
            message="Email verified successfully",
            access_token=access_token,
            token_type="bearer",
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
# =========================================================
# RESEND EMAIL OTP
# =========================================================

@router.post("/resend-otp")
async def resend_otp_route(
    data: ResendOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await resend_otp(db, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# =========================================================
# LOGIN
# =========================================================

@router.post(
    "/login",
    response_model=AuthResponse,
)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        user, access_token = await login_user(
            db,
            data,
        )

        return AuthResponse(
            message="Login successful",
            access_token=access_token,
            token_type="bearer",
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


# =========================================================
# GOOGLE LOGIN
# =========================================================

@router.get("/google/login")
async def google_login_start(
    request: Request,
):
    state = generate_oauth_state()

    request.session["google_oauth_state"] = state
    print("GOOGLE LOGIN STATE:", state)
    print("GOOGLE SESSION:", dict(request.session))
    return RedirectResponse(
        url=get_google_authorization_url(state)
    )


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    print("GOOGLE CALLBACK STATE:", state)
    print("GOOGLE SESSION BEFORE:", dict(request.session))
    saved_state = request.session.pop(
        "google_oauth_state",
        None,
    )
    print("SAVED STATE:", saved_state)
    if (
        not saved_state
        or not secrets.compare_digest(saved_state, state)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth state",
        )

    try:
        user, access_token = await google_login(
            db,
            code,
        )

        return RedirectResponse(
            url=(
                f"{settings.FRONTEND_URL}"
                f"/oauth/callback#access_token={access_token}"
            )
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# =========================================================
# MICROSOFT LOGIN
# =========================================================

@router.get("/microsoft/login")
async def microsoft_login_start(
    request: Request,
):
    state = generate_oauth_state()

    request.session["microsoft_oauth_state"] = state

    return RedirectResponse(
        url=get_microsoft_authorization_url(state)
    )


@router.get("/microsoft/callback")
async def microsoft_callback(
    request: Request,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    saved_state = request.session.pop(
        "microsoft_oauth_state",
        None,
    )

    if (
        not saved_state
        or not secrets.compare_digest(saved_state, state)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth state",
        )

    try:
        user, access_token = await microsoft_login(
            db,
            code,
        )

        return RedirectResponse(
            url=(
                f"{settings.FRONTEND_URL}"
                f"/oauth/callback#access_token={access_token}"
            )
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# =========================================================
# CURRENT USER
# =========================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    payload = verify_access_token(credentials.credentials)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


# =========================================================
# MY PROFILE
# =========================================================

@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserIdentity).where(
            UserIdentity.user_id == current_user.id
        )
    )
    identities = result.scalars().all()

    providers = [identity.provider for identity in identities]

    if current_user.password_hash is not None:
        providers.insert(0, "local")

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "bio": current_user.bio,
        "location": current_user.location,
        "website": current_user.website,
        "social_links": current_user.social_links or {},
        "providers": providers,
        "has_password": current_user.password_hash is not None,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
    }


@router.put("/me")
async def update_me(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.name is not None:
        current_user.name = data.name.strip()
    if data.bio is not None:
        current_user.bio = data.bio.strip()
    if data.location is not None:
        current_user.location = data.location.strip()
    if data.website is not None:
        current_user.website = data.website.strip()
    if data.social_links is not None:
        current_user.social_links = data.social_links

    await db.commit()
    await db.refresh(current_user)

    result = await db.execute(
        select(UserIdentity).where(
            UserIdentity.user_id == current_user.id
        )
    )
    identities = result.scalars().all()

    providers = [identity.provider for identity in identities]

    if current_user.password_hash is not None:
        providers.insert(0, "local")

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "bio": current_user.bio,
        "location": current_user.location,
        "website": current_user.website,
        "social_links": current_user.social_links or {},
        "providers": providers,
        "has_password": current_user.password_hash is not None,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
    }


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.password_hash:
        if not data.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required",
            )
        if not verify_password(data.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password",
            )

    current_user.password_hash = hash_password(data.new_password)
    await db.commit()

    return {"message": "Password updated successfully"}


# =========================================================
# FORGOT PASSWORD
# =========================================================

@router.post("/forgot-password")
async def forgot_password_route(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await forgot_password(db, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# =========================================================
# RESEND RESET OTP
# =========================================================

@router.post("/resend-reset-otp")
async def resend_reset_otp_route(
    data: ResendResetOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await resend_reset_otp(db, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# =========================================================
# RESET PASSWORD
# =========================================================

@router.post("/reset-password")
async def reset_password_route(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await reset_password(db, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )




@router.get("/github/login")
async def github_login_start(
    request: Request,
):
    state = generate_oauth_state()

    request.session["github_oauth_state"] = state

    return RedirectResponse(
        url=get_github_authorization_url(state)
    )




@router.get("/github/callback")
async def github_callback(
    request: Request,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    # ---------------------------------------------------------
    # Check which GitHub flow started
    # ---------------------------------------------------------

    connect_user_id = request.session.pop(
        "github_connect_user_id",
        None,
    )

    # Login flow uses github_oauth_state
    login_state = request.session.pop(
        "github_oauth_state",
        None,
    )

    # Connect flow uses github_connect_state
    connect_state = request.session.pop(
        "github_connect_state",
        None,
    )

    saved_state = login_state or connect_state

    print("========== GITHUB CALLBACK ==========")
    print("Received state:", state)
    print("Login state:", login_state)
    print("Connect state:", connect_state)
    print("Connect user ID:", connect_user_id)
    print("=====================================")

    # ---------------------------------------------------------
    # Verify OAuth state
    # ---------------------------------------------------------

    if (
        not saved_state
        or not secrets.compare_digest(
            saved_state,
            state,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth state",
        )

    try:
        # -----------------------------------------------------
        # CONNECT GITHUB TO EXISTING LOGGED-IN USER
        # -----------------------------------------------------

        if connect_user_id:
            result = await db.execute(
                select(User).where(
                    User.id == int(connect_user_id)
                )
            )

            user = result.scalar_one_or_none()

            if not user:
                raise ValueError(
                    "User account not found"
                )

            if not user.is_active:
                raise ValueError(
                    "User account is inactive"
                )

            await github_connect(
                db,
                user,
                code,
            )

            return RedirectResponse(
                url=(
                    f"{settings.FRONTEND_URL}"
                    f"/dashboard?github=connected"
                )
            )

        # -----------------------------------------------------
        # NORMAL GITHUB LOGIN
        # -----------------------------------------------------

        user, access_token = await github_login(
            db,
            code,
        )

        return RedirectResponse(
            url=(
                f"{settings.FRONTEND_URL}"
                f"/oauth/callback"
                f"#access_token={access_token}"
            )
        )

    except ValueError as e:
        print("========== GITHUB CONNECT ERROR ==========")
        print("ERROR:", str(e))
        print("REDIRECTING TO DASHBOARD")
        print("==========================================")

        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/dashboard?github_error={quote(str(e))}",
            status_code=302,
        )
