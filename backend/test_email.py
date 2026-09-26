from services.email.email_service import send_otp_email

send_otp_email(
    "madhurporas1@gmail.com",
    "123456",
    "email_verification",
)

print("Email sent successfully!")

