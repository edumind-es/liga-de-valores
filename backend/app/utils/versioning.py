import hashlib
import json
from typing import Any


def stable_hash(data: Any) -> str:
    """
    Create a deterministic hash for JSON-serializable data.
    """
    payload = json.dumps(data, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
