from app.config import settings
import asyncio
import resend

resend.api_key = settings.RESEND_API_KEY

def _send_otp_email_sync(to_email: str, otp: str):
    resend.Emails.send({
        "from": settings.EMAIL_FROM,
        "to": to_email,
        "subject": "Your cachette password reset code",
        "html": f"""
            <p>Your password reset code is:</p>
            <h2>{otp}</h2>
            <p>This code expires in 5 minutes. If you didn't request this, ignore this email.</p>
        """
    })

async def send_otp_email(to_email: str, otp: str):
    await asyncio.to_thread(_send_otp_email_sync, to_email, otp)