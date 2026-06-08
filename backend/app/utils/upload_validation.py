#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#

from __future__ import annotations

from typing import Iterable

from fastapi import HTTPException, UploadFile, status


def validate_upload_file(
    upload: UploadFile,
    *,
    allowed_mime_types: Iterable[str],
    max_bytes: int,
    field_name: str,
) -> None:
    allowed = set(allowed_mime_types)
    if upload.content_type not in allowed:
        allowed_labels = ", ".join(sorted(allowed))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name}: tipo de archivo no permitido ({allowed_labels}).",
        )

    size = None
    try:
        upload.file.seek(0, 2)
        size = upload.file.tell()
        upload.file.seek(0)
    except Exception:
        # If stream metadata is unavailable, fallback to bounded read.
        data = upload.file.read(max_bytes + 1)
        size = len(data)
        try:
            upload.file.seek(0)
        except Exception:
            pass

    if size is not None and size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"{field_name}: archivo demasiado grande. Maximo permitido: {max_bytes // (1024 * 1024)}MB.",
        )
