"""
Servicio de notificaciones Discord para mantenimiento operacional.
Usa el webhook configurado en DISCORD_WEBHOOK_URL.
NOTA: nunca enviar material criptográfico (claves, tokens) por este canal.
"""
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


async def notify_discord(message: str, *, level: str = "info") -> None:
    """
    Envía un mensaje al webhook Discord de mantenimiento.
    level: "info" | "warning" | "critical"
    """
    if not settings.DISCORD_WEBHOOK_URL:
        return

    icons = {"info": "ℹ️", "warning": "⚠️", "critical": "🔴"}
    prefix = icons.get(level, "ℹ️")
    content = f"{prefix} **[Liga EDUmind]** {message}"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                settings.DISCORD_WEBHOOK_URL,
                json={"content": content},
            )
    except Exception:
        logger.warning("No se pudo enviar notificación Discord", exc_info=True)
