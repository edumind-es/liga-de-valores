import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from datetime import datetime, timezone

def _load_secret_from_file(env_name: str) -> str | None:
    path = os.getenv(f"{env_name}_FILE")
    if not path:
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return handle.read().strip()
    except OSError:
        return None

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    APP_NAME: str = "Liga EDUmind"
    DEBUG: bool = False
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_STORAGE_URL: str | None = None
    AUTH_ACCESS_COOKIE_NAME: str = "edumind_access_token"
    AUTH_REFRESH_COOKIE_NAME: str = "edumind_refresh_token"
    AUTH_COOKIE_SECURE: bool = True
    AUTH_COOKIE_SAMESITE: str = "lax"
    AUTH_COOKIE_DOMAIN: str | None = None
    AUTH_COOKIE_PATH: str = "/"
    AUTH_ALLOW_REFRESH_TOKEN_IN_BODY: bool = False
    AUTHENTIK_ENABLED: bool = False
    AUTHENTIK_ISSUER_URL: str | None = None
    AUTHENTIK_CLIENT_ID: str | None = None
    AUTHENTIK_CLIENT_SECRET: str | None = None
    AUTHENTIK_REDIRECT_URI: str | None = None
    AUTHENTIK_SCOPES: str = "openid profile email"
    AUTHENTIK_AUTO_PROVISION: bool = False
    AUTHENTIK_ALLOWED_EMAIL_DOMAINS: str | None = None
    SECURITY_HEADERS_ENABLED: bool = True
    SECURITY_CSP: str = (
        "default-src 'self'; "
        "base-uri 'self'; "
        "object-src 'none'; "
        "frame-ancestors 'self' https://*.edumind.es https://*.losmundosedufis.com; "
        "form-action 'self' https://auth.edumind.es; "
        "upgrade-insecure-requests"
    )
    SECURITY_PERMISSIONS_POLICY: str = (
        "accelerometer=(), autoplay=(), camera=(), display-capture=(), "
        "geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()"
    )
    SECURITY_CROSS_ORIGIN_OPENER_POLICY: str = "same-origin-allow-popups"
    SECURITY_REFERRER_POLICY: str = "strict-origin-when-cross-origin"
    SECURITY_FRAME_OPTIONS: str = "SAMEORIGIN"
    SECURITY_HSTS_SECONDS: int = 63072000
    SECURITY_HSTS_INCLUDE_SUBDOMAINS: bool = True
    SECURITY_HSTS_PRELOAD: bool = True
    FREE_PLAN_MAX_LEAGUES: int = 3
    LEAGUE_GRANDFATHERING_CUTOFF: datetime = datetime(2026, 6, 30, 23, 59, 59, tzinfo=timezone.utc)
    
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Frontend
    FRONTEND_URL: str = "https://liga.edumind.es"

    # Email
    DISCORD_WEBHOOK_URL: str | None = None
    DISCORD_INCLUDE_CONTACT_EMAIL: bool = False
    MAIL_SERVER: str = "mail.smtp2go.com"
    MAIL_PORT: int = 587
    MAIL_USERNAME: str | None = None
    MAIL_PASSWORD: str | None = None
    MAIL_FROM: str | None = None
    MAIL_FROM_NAME: str = "Liga EDUmind"
    
    # Storage
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads")
    MAX_UPLOAD_SIZE_MB: int = 5
    MAX_REQUEST_SIZE_MB: int = 8
    SUBMISSION_POLICY_NOTICE_VERSION: str = "2026-04-02"
    SUBMISSION_BLOCKLIST_TERMS: str | None = None
    SUBMISSION_FINGERPRINT_SECRET: str | None = None

    # Ops metrics security
    METRICS_ALLOWED_IPS: str = "127.0.0.1,::1"
    METRICS_TOKEN: str | None = None

    # IPs de proxies de confianza que pueden fijar X-Forwarded-For (nginx en localhost)
    TRUSTED_PROXIES: str = "127.0.0.1,::1"

    # Clave Fernet para cifrado de credenciales Nextcloud.
    # DEBE ser independiente de SECRET_KEY para que rotar el secreto JWT
    # no invalide credenciales almacenadas.
    # Generar con: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # Si no está configurada, se usa fallback SHA256(SECRET_KEY) con aviso de mantenimiento.
    ENCRYPTION_KEY: str | None = None
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175", 
        "http://127.0.0.1:5175",
        "http://localhost:5181",
        "http://127.0.0.1:5181",
        "http://localhost:5182",
        "http://127.0.0.1:5182",
        "https://liga.edumind.es",
        "https://auth.edumind.es",
        "https://panel.edumind.es",
    ]
    
    # Matomo
    MATOMO_BASE_URL: str | None = None
    MATOMO_SITE_ID: str | None = None
    
    # Nextcloud Xunta (Evidencias)
    NEXTCLOUD_WEBDAV_URL: str | None = None  # e.g., https://boxabalar.edu.xunta.gal/remote.php/dav/files/USERNAME/
    NEXTCLOUD_USERNAME: str | None = None
    NEXTCLOUD_PASSWORD: str | None = None
    NEXTCLOUD_EVIDENCIAS_PATH: str = "Evidencias_Liga"
    NEXTCLOUD_ALLOWED_EMAIL: str | None = None  # Restrict uploads to this user only (set via env)
    NEXTCLOUD_ALLOWED_IDENTITIES: str | None = None  # Comma-separated emails and/or user codes for legacy global uploads
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    def model_post_init(self, __context) -> None:
        file_overrides = {
            "SECRET_KEY": _load_secret_from_file("SECRET_KEY"),
            "DATABASE_URL": _load_secret_from_file("DATABASE_URL"),
            "MAIL_PASSWORD": _load_secret_from_file("MAIL_PASSWORD"),
            "NEXTCLOUD_PASSWORD": _load_secret_from_file("NEXTCLOUD_PASSWORD"),
            "AUTHENTIK_CLIENT_SECRET": _load_secret_from_file("AUTHENTIK_CLIENT_SECRET"),
        }
        for key, value in file_overrides.items():
            if value:
                setattr(self, key, value)

# Global settings instance
settings = Settings()
