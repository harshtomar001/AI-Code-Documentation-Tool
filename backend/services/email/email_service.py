import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config.settings import settings


def send_email(to_email: str, subject: str, body: str):
    message = MIMEMultipart()
    message["From"] = settings.EMAIL_FROM
    message["To"] = to_email
    message["Subject"] = subject

    message.attach(MIMEText(body, "html"))

    with smtplib.SMTP(
        settings.SMTP_HOST,
        settings.SMTP_PORT
    ) as server:

        server.starttls()

        server.login(
            settings.SMTP_USERNAME,
            settings.SMTP_PASSWORD
        )

        server.send_message(message)


def send_otp_email(
    to_email: str,
    otp: str,
    purpose: str
):
    if purpose == "email_verification":
        subject = "Verify your AI Code Documentation Tool account"

        body = f"""
        <html>
        <body>
            <h2>Email Verification</h2>

            <p>Your verification OTP is:</p>

            <h1>{otp}</h1>

            <p>This OTP expires in 10 minutes.</p>

            <p>If you did not request this, you can ignore this email.</p>
        </body>
        </html>
        """

    elif purpose == "password_reset":
        subject = "Password Reset OTP"

        body = f"""
        <html>
        <body>
            <h2>Password Reset</h2>

            <p>Your password reset OTP is:</p>

            <h1>{otp}</h1>

            <p>This OTP expires in 10 minutes.</p>

            <p>If you did not request this, you can ignore this email.</p>
        </body>
        </html>
        """

    else:
        raise ValueError("Invalid OTP purpose")

    send_email(
        to_email,
        subject,
        body
    )

