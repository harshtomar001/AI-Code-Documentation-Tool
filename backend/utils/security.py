import bcrypt


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")

    if len(password_bytes) > 72:
        raise ValueError("Password must not exceed 72 bytes")

    salt = bcrypt.gensalt()

    hashed = bcrypt.hashpw(
        password_bytes,
        salt
    )

    return hashed.decode("utf-8")


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:

    plain_password_bytes = plain_password.encode("utf-8")

    if len(plain_password_bytes) > 72:
        return False

    return bcrypt.checkpw(
        plain_password_bytes,
        hashed_password.encode("utf-8")
    )


def hash_otp(otp: str) -> str:
    return bcrypt.hashpw(
        otp.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_otp(
    otp: str,
    otp_hash: str
) -> bool:

    return bcrypt.checkpw(
        otp.encode("utf-8"),
        otp_hash.encode("utf-8")
    )

