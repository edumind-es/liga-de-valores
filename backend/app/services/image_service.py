#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.
#

"""
Image processing service for team logos and other uploads.
Handles image optimization, resizing, and format conversion.
"""
import os
import uuid
import base64
from pathlib import Path
from PIL import Image
from fastapi import UploadFile, HTTPException
import io

class ImageService:
    """Service for processing and optimizing images."""
    
    UPLOAD_DIR = Path("static/uploads/team_logos")
    MAX_SIZE_MB = 5
    MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
    LOGO_SIZE = (200, 200)
    WEBP_QUALITY = 85
    ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

    @classmethod
    def _process_and_save_logo(cls, contents: bytes, content_type: str, equipo_id: int) -> str:
        """Validate, optimize and persist a logo image."""
        if content_type not in cls.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Tipo de archivo no permitido. Usa JPEG, PNG o WebP."
            )

        if len(contents) > cls.MAX_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"El archivo es demasiado grande. Máximo {cls.MAX_SIZE_MB}MB."
            )

        try:
            image = Image.open(io.BytesIO(contents))

            if image.mode in ('RGBA', 'LA', 'P'):
                image = image.convert('RGBA')
            elif image.mode != 'RGB':
                image = image.convert('RGB')

            image.thumbnail(cls.LOGO_SIZE, Image.Resampling.LANCZOS)

            final_image = Image.new(
                'RGBA' if image.mode == 'RGBA' else 'RGB',
                cls.LOGO_SIZE,
                (255, 255, 255, 0) if image.mode == 'RGBA' else (255, 255, 255),
            )

            x = (cls.LOGO_SIZE[0] - image.width) // 2
            y = (cls.LOGO_SIZE[1] - image.height) // 2
            final_image.paste(image, (x, y))

            filename = f"team_{equipo_id}_{uuid.uuid4().hex[:12]}.webp"
            filepath = cls.UPLOAD_DIR / filename
            cls.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

            final_image.save(
                filepath,
                format='WEBP',
                quality=cls.WEBP_QUALITY,
                method=6,
            )

            return f"/static/uploads/team_logos/{filename}"
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Error al procesar la imagen: {str(exc)}"
            ) from exc
    
    @classmethod
    async def save_team_logo(cls, file: UploadFile, equipo_id: int) -> str:
        """
        Process and save team logo.
        
        Args:
            file: Uploaded file
            equipo_id: Team ID for filename
            
        Returns:
            Relative URL path to saved logo
            
        Raises:
            HTTPException: If file is invalid or too large
        """
        # Read file content
        contents = await file.read()
        content_type = file.content_type or "application/octet-stream"
        return cls._process_and_save_logo(contents, content_type, equipo_id)

    @classmethod
    def save_team_logo_data_url(cls, data_url: str, equipo_id: int) -> str:
        """
        Persist a PNG/JPEG/WebP data URL generated in the public logo designer.
        """
        if not data_url.startswith("data:image/") or ";base64," not in data_url:
            raise HTTPException(
                status_code=400,
                detail="Formato de logo no válido",
            )

        header, encoded = data_url.split(",", 1)
        mime_match = header.split(";", 1)[0].replace("data:", "")
        try:
            contents = base64.b64decode(encoded)
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail="No se pudo procesar la imagen del logo",
            ) from exc

        return cls._process_and_save_logo(contents, mime_match, equipo_id)
    
    @classmethod
    def delete_team_logo(cls, logo_url: str) -> None:
        """
        Delete a team logo file from disk.
        
        Args:
            logo_url: URL path of the logo to delete
        """
        if not logo_url:
            return
        
        try:
            # Extract filename from URL
            filename = Path(logo_url).name
            filepath = cls.UPLOAD_DIR / filename
            
            # Delete file if it exists
            if filepath.exists():
                filepath.unlink()
        except Exception:
            # Silently fail - don't crash if file doesn't exist
            pass
