from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import User, OTPVerification
from schemas.auth.auth import (
    RegisterRequest,
    VerifyEmailRequest,
    ResendOTPRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResendResetOTPRequest,
    ResetPasswordRequest,
)
from utils.security import (
    hash_password,
    verify_password,
    hash_otp,
    verify_otp,
)
from utils.jwt import create_access_token
from utils.otp import generate_otp
from services.email.email_service import send_otp_email


OTP_EXPIRY_MINUTES = 10
MAX_OTP_ATTEMPTS = 5


def _create_access_token(user: User) -> str:
    return create_access_token(
        {
            "sub": str(user.id),
            "email": user.email,
        }
    )


async def register_user(
    db: AsyncSession,
    data: RegisterRequest,
):
    email = str(data.email).strip().lower()

    result = await db.execute(
        select(User).where(User.email == email)
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise ValueError("Email already registered")

    user = User(
        name=data.name.strip(),
        email=email,
        password_hash=hash_password(data.password),
        is_active=True,
        is_verified=False,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    otp = generate_otp()

    otp_record = OTPVerification(
        user_id=user.id,
        otp_hash=hash_otp(otp),
        purpose="email_verification",
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=OTP_EXPIRY_MINUTES),
        attempts=0,
        is_used=False,
    )

    db.add(otp_record)
    await db.commit()

    try:
        send_otp_email(
            user.email,
            otp,
            "email_verification",
        )
    except Exception:
        raise ValueError("Could not send verification email")

    return {
        "message": "Registration successful. OTP sent to your email."
    }


async def verify_email(
    db: AsyncSession,
    email: str,
    otp: str,
):
    email = str(email).strip().lower()

    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise ValueError("User not found")

    if user.is_verified:
        raise ValueError("Email is already verified")

    result = await db.execute(
        select(OTPVerification)
        .where(
            OTPVerification.user_id == user.id,
            OTPVerification.purpose == "email_verification",
            OTPVerification.is_used.is_(False),
        )
        .order_by(OTPVerification.created_at.desc())
        .limit(1)
    )
    otp_record = result.scalar_one_or_none()

    if not otp_record:
        raise ValueError("No OTP found")

    now = datetime.now(timezone.utc)

    if otp_record.expires_at <= now:
        otp_record.is_used = True
        await db.commit()
        raise ValueError("OTP has expired")

    if otp_record.attempts >= MAX_OTP_ATTEMPTS:
        otp_record.is_used = True
        await db.commit()
        raise ValueError("Too many incorrect OTP attempts")

    if not verify_otp(otp, otp_record.otp_hash):
        otp_record.attempts += 1

        if otp_record.attempts >= MAX_OTP_ATTEMPTS:
            otp_record.is_used = True

        await db.commit()

        if otp_record.attempts >= MAX_OTP_ATTEMPTS:
            raise ValueError("Too many incorrect OTP attempts")

        raise ValueError("Invalid OTP")

    user.is_verified = True
    otp_record.is_used = True

    await db.commit()
    await db.refresh(user)

    access_token = _create_access_token(user)

    return user, access_token


async def resend_otp(
    db: AsyncSession,
    data: ResendOTPRequest,
):
    email = str(data.email).strip().lower()

    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise ValueError("User not found")

    if user.is_verified:
        return {
            "message": "Email is already verified"
        }

    result = await db.execute(
        select(OTPVerification).where(
            OTPVerification.user_id == user.id,
            OTPVerification.purpose == "email_verification",
            OTPVerification.is_used.is_(False),
        )
    )
    old_otps = result.scalars().all()

    for old_otp in old_otps:
        old_otp.is_used = True

    otp = generate_otp()

    otp_record = OTPVerification(
        user_id=user.id,
        otp_hash=hash_otp(otp),
        purpose="email_verification",
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=OTP_EXPIRY_MINUTES),
        attempts=0,
        is_used=False,
    )

    db.add(otp_record)
    await db.commit()

    try:
        send_otp_email(
            user.email,
            otp,
            "email_verification",
        )
    except Exception:
        raise ValueError("Could not send verification email")

    return {
        "message": "A new OTP has been sent"
    }


async def login_user(
    db: AsyncSession,
    data: LoginRequest,
):
    email = str(data.email).strip().lower()

    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise ValueError("Invalid email or password")

    if not user.is_active:
        raise ValueError("Account is inactive")

    if not user.password_hash:
        raise ValueError(
            "This account does not have a password. "
            "Please login using Google or Microsoft."
        )

    if not user.is_verified:
        raise ValueError(
            "Please verify your email before logging in"
        )

    if not verify_password(data.password, user.password_hash):
        raise ValueError("Invalid email or password")

    access_token = _create_access_token(user)

    return user, access_token


async def forgot_password(
    db: AsyncSession,
    data: ForgotPasswordRequest,
):
    email = str(data.email).strip().lower()

    generic_message = (
        "If an account exists with this email, "
        "a password reset OTP has been sent."
    )

    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not user.is_active:
        return {"message": generic_message}

    result = await db.execute(
        select(OTPVerification).where(
            OTPVerification.user_id == user.id,
            OTPVerification.purpose == "password_reset",
            OTPVerification.is_used.is_(False),
        )
    )
    old_otps = result.scalars().all()

    for old_otp in old_otps:
        old_otp.is_used = True

    otp = generate_otp()

    otp_record = OTPVerification(
        user_id=user.id,
        otp_hash=hash_otp(otp),
        purpose="password_reset",
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=OTP_EXPIRY_MINUTES),
        attempts=0,
        is_used=False,
    )

    db.add(otp_record)
    await db.commit()

    try:
        send_otp_email(
            user.email,
            otp,
            "password_reset",
        )
    except Exception:
        raise ValueError("Could not send password reset email")

    return {"message": generic_message}


async def resend_reset_otp(
    db: AsyncSession,
    data: ResendResetOTPRequest,
):
    email = str(data.email).strip().lower()

    generic_message = (
        "If an account exists with this email, "
        "a new password reset OTP has been sent."
    )

    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not user.is_active:
        return {"message": generic_message}

    result = await db.execute(
        select(OTPVerification).where(
            OTPVerification.user_id == user.id,
            OTPVerification.purpose == "password_reset",
            OTPVerification.is_used.is_(False),
        )
    )
    old_otps = result.scalars().all()

    for old_otp in old_otps:
        old_otp.is_used = True

    otp = generate_otp()

    otp_record = OTPVerification(
        user_id=user.id,
        otp_hash=hash_otp(otp),
        purpose="password_reset",
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=OTP_EXPIRY_MINUTES),
        attempts=0,
        is_used=False,
    )

    db.add(otp_record)
    await db.commit()

    try:
        send_otp_email(
            user.email,
            otp,
            "password_reset",
        )
    except Exception:
        raise ValueError("Could not send password reset email")

    return {"message": generic_message}


async def reset_password(
    db: AsyncSession,
    data: ResetPasswordRequest,
):
    email = str(data.email).strip().lower()

    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise ValueError("Invalid email or OTP")

    if not user.password_hash:
        raise ValueError(
            "Password reset is not available for this account"
        )

    if not user.is_active:
        raise ValueError("Invalid email or OTP")

    result = await db.execute(
        select(OTPVerification)
        .where(
            OTPVerification.user_id == user.id,
            OTPVerification.purpose == "password_reset",
            OTPVerification.is_used.is_(False),
        )
        .order_by(OTPVerification.created_at.desc())
        .limit(1)
    )
    otp_record = result.scalar_one_or_none()

    if not otp_record:
        raise ValueError("Invalid or expired OTP")

    now = datetime.now(timezone.utc)

    if otp_record.expires_at <= now:
        otp_record.is_used = True
        await db.commit()
        raise ValueError("Invalid or expired OTP")

    if otp_record.attempts >= MAX_OTP_ATTEMPTS:
        otp_record.is_used = True
        await db.commit()
        raise ValueError("Too many incorrect OTP attempts")

    if not verify_otp(data.otp, otp_record.otp_hash):
        otp_record.attempts += 1

        if otp_record.attempts >= MAX_OTP_ATTEMPTS:
            otp_record.is_used = True

        await db.commit()

        if otp_record.attempts >= MAX_OTP_ATTEMPTS:
            raise ValueError("Too many incorrect OTP attempts")

        raise ValueError("Invalid OTP")

    user.password_hash = hash_password(data.new_password)
    otp_record.is_used = True

    result = await db.execute(
        select(OTPVerification).where(
            OTPVerification.user_id == user.id,
            OTPVerification.purpose == "password_reset",
            OTPVerification.is_used.is_(False),
        )
    )
    remaining_otps = result.scalars().all()

    for old_otp in remaining_otps:
        old_otp.is_used = True

    await db.commit()

    return {
        "message": "Password reset successfully"
    }


