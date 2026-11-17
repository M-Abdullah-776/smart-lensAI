import logging
from email.message import EmailMessage
from app.config import settings

logger = logging.getLogger("smartlens.email")

async def send_verification_email(to_email: str, full_name: str, token: str):
    verification_link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    
    # If no SMTP configured, log clearly in console for local testing
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "=" * 70)
        print("📧 [DEVELOPMENT MODE] EMAIL VERIFICATION LINK GENERATED:")
        print(f"Recipient: {full_name} <{to_email}>")
        print(f"Verify Link: {verification_link}")
        print("=" * 70 + "\n")
        logger.info(f"Dev verification link for {to_email}: {verification_link}")
        return

    try:
        import aiosmtplib
        msg = EmailMessage()
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email
        msg["Subject"] = "Verify Your SmartLens AI Account"
        msg.set_content(
            f"Hello {full_name},\n\n"
            f"Thank you for signing up for SmartLens AI. Please verify your email address by visiting this link:\n"
            f"{verification_link}\n\n"
            f"If you did not create this account, please ignore this email.\n\n"
            f"The SmartLens AI Team"
        )
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True
        )
    except Exception as e:
        logger.error(f"Failed to send verification email to {to_email}: {str(e)}")

async def send_password_reset_email(to_email: str, full_name: str, token: str):
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "=" * 70)
        print("🔑 [DEVELOPMENT MODE] PASSWORD RESET LINK GENERATED:")
        print(f"Recipient: {full_name} <{to_email}>")
        print(f"Reset Link: {reset_link}")
        print("=" * 70 + "\n")
        logger.info(f"Dev password reset link for {to_email}: {reset_link}")
        return

    try:
        import aiosmtplib
        msg = EmailMessage()
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email
        msg["Subject"] = "Reset Your SmartLens AI Password"
        msg.set_content(
            f"Hello {full_name},\n\n"
            f"We received a request to reset your password. Please visit this link to set a new password:\n"
            f"{reset_link}\n\n"
            f"This link will expire in 1 hour. If you did not request this, please ignore this email.\n\n"
            f"The SmartLens AI Team"
        )
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True
        )
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {str(e)}")
