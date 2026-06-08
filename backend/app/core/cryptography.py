import base64
import hashlib
import logging

from cryptography.fernet import Fernet
from app.config import settings

logger = logging.getLogger(__name__)

# Modo de operación: "dedicated" si ENCRYPTION_KEY está configurada, "fallback" si no.
# En modo fallback la clave se deriva de SECRET_KEY — si SECRET_KEY cambia,
# las credenciales cifradas quedan irrecuperables. Se emite una advertencia al iniciar.
_ENCRYPTION_MODE: str = "uninitialized"


class CryptoManager:
    """
    Cifrado simétrico Fernet para credenciales sensibles (p.ej. Nextcloud).

    Orden de prioridad de clave:
    1. ENCRYPTION_KEY (env var) — clave Fernet directa, ciclo de vida independiente de SECRET_KEY.
    2. Fallback: SHA256(SECRET_KEY) — compatible con instalaciones existentes,
       pero se emite advertencia de mantenimiento al arrancar.
    """

    def __init__(self):
        global _ENCRYPTION_MODE

        if settings.ENCRYPTION_KEY:
            # Clave dedicada: debe ser un Fernet key válido (44 chars base64url)
            try:
                # Fernet valida el formato en el constructor
                self.fernet = Fernet(settings.ENCRYPTION_KEY.encode())
                _ENCRYPTION_MODE = "dedicated"
            except Exception as exc:
                raise ValueError(
                    "ENCRYPTION_KEY configurada pero inválida. "
                    "Genera una con: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
                ) from exc
        else:
            # Fallback: derivar de SECRET_KEY (retrocompatibilidad)
            if not settings.SECRET_KEY:
                raise ValueError("SECRET_KEY no configurada")
            key_hash = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
            self.fernet = Fernet(base64.urlsafe_b64encode(key_hash))
            _ENCRYPTION_MODE = "fallback"
            logger.warning(
                "ENCRYPTION_KEY no configurada. Usando SHA256(SECRET_KEY) como clave de cifrado. "
                "Riesgo: si SECRET_KEY cambia, las credenciales Nextcloud quedan irrecuperables. "
                "Configura ENCRYPTION_KEY en .env para independizar los ciclos de vida."
            )

    def encrypt(self, plain_text: str) -> str | None:
        if not plain_text:
            return None
        return self.fernet.encrypt(plain_text.encode()).decode()

    def decrypt(self, cipher_text: str) -> str | None:
        if not cipher_text:
            return None
        try:
            return self.fernet.decrypt(cipher_text.encode()).decode()
        except Exception:
            return None


def is_using_fallback_encryption() -> bool:
    """Devuelve True si el sistema usa el modo fallback (sin ENCRYPTION_KEY dedicada)."""
    return _ENCRYPTION_MODE == "fallback"


# Instancia global
crypto = CryptoManager()
