import os
from urllib.parse import urlparse


def _load_secret_from_file(env_name: str) -> str | None:
    path = os.getenv(f"{env_name}_FILE")
    if not path:
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return handle.read().strip()
    except OSError:
        return None


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL") or _load_secret_from_file("DATABASE_URL")
    if not url:
        raise SystemExit("ERROR: DATABASE_URL no está configurada.")

    # Allow sqlite without extra guards (used for tests).
    if url.startswith("sqlite"):
        return url

    host = urlparse(url).hostname or ""
    prod_hosts = [
        h.strip()
        for h in os.getenv("PROD_DB_HOSTS", "").split(",")
        if h.strip()
    ]
    if prod_hosts and host in prod_hosts and os.getenv("ALLOW_PROD_DB") != "1":
        raise SystemExit(
            "ERROR: Bloqueado por seguridad. "
            "La base coincide con PROD_DB_HOSTS. "
            "Para ejecutar en producción, exporta ALLOW_PROD_DB=1."
        )

    return url
