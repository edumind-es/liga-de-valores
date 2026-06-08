
import smtplib
from email.message import EmailMessage
from app.config import settings


async def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Sends a simple email without attachments.
    Returns True if successful, False otherwise.
    """
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>" if settings.MAIL_FROM else settings.MAIL_FROM_NAME
    msg['To'] = to_email
    msg.set_content(body)

    try:
        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as server:
            if settings.MAIL_USERNAME and settings.MAIL_PASSWORD:
                server.starttls()
                server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


def send_email_with_attachment(to_email: str, subject: str, body: str, file_content: bytes, filename: str) -> bool:
    """
    Sends an email with an attachment using the configured SMTP server.
    Returns True if successful, False otherwise.
    """
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>" if settings.MAIL_FROM else settings.MAIL_FROM_NAME
    msg['To'] = to_email
    msg.set_content(body)

    # Add attachment
    msg.add_attachment(file_content, maintype='application', subtype='pdf', filename=filename)

    try:
        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as server:
            if settings.MAIL_USERNAME and settings.MAIL_PASSWORD:
                server.starttls()
                server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


def send_email_with_attachments(to_email: str, subject: str, body: str, attachments: list) -> bool:
    """
    Sends an email with multiple attachments using the configured SMTP server.
    
    Args:
        attachments: List of tuples (file_content: bytes, filename: str)
    
    Returns True if successful, False otherwise.
    """
    import mimetypes
    
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>" if settings.MAIL_FROM else settings.MAIL_FROM_NAME
    msg['To'] = to_email
    msg.set_content(body)

    # Add all attachments
    for file_content, filename in attachments:
        # Guess MIME type from filename
        mime_type, _ = mimetypes.guess_type(filename)
        if mime_type:
            maintype, subtype = mime_type.split('/', 1)
        else:
            maintype, subtype = 'application', 'octet-stream'
        
        msg.add_attachment(file_content, maintype=maintype, subtype=subtype, filename=filename)

    try:
        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as server:
            if settings.MAIL_USERNAME and settings.MAIL_PASSWORD:
                server.starttls()
                server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
