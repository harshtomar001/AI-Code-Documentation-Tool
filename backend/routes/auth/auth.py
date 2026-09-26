import secrets

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
)

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
    saved_state = request.session.pop(
        "google_oauth_state",
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
        user, access_token = await google_login(
            db,
            code,
        )

        return AuthResponse(
            message="Google login successful",
            access_token=access_token,
            token_type="bearer",
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

        return AuthResponse(
            message="Microsoft login successful",
            access_token=access_token,
            token_type="bearer",
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
        "providers": providers,
        "has_password": current_user.password_hash is not None,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
    }


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




