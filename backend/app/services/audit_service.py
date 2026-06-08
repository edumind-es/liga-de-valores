"""
Servicio de auditoría — registra operaciones destructivas para trazabilidad RGPD.
"""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


async def log_audit_event(
    db: AsyncSession,
    *,
    user_id: int | None,
    action: str,
    resource: str,
    resource_id: int | None = None,
    resource_name: str | None = None,
    ip_address: str | None = None,
    details: dict | None = None,
) -> None:
    """
    Registra un evento de auditoría en la tabla audit_log.
    Es fire-and-forget dentro de la misma transacción — no lanza excepciones.
    """
    try:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            resource_name=resource_name,
            ip_address=ip_address,
            details=details,
        )
        db.add(entry)
    except Exception:
        logger.exception("No se pudo registrar evento de auditoría: action=%s resource=%s/%s", action, resource, resource_id)
