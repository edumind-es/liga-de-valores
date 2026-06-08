#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#

"""
Servicio de integración con Nextcloud via WebDAV.
Permite subir evidencias (PDFs de fichas de juegos) organizadas por liga y alumno.
"""

import httpx
from datetime import date
from typing import Optional
from app.config import settings


class NextcloudService:
    """Servicio para subir archivos a Nextcloud via WebDAV."""
    
    def __init__(self, username=None, password=None, url=None):
        # Permitir inicializar con credenciales específicas (para usuarios)
        # O caer en defaults (para configuración global/legacy si se usara)
        self.base_url = url or settings.NEXTCLOUD_WEBDAV_URL
        self.username = username or settings.NEXTCLOUD_USERNAME
        self.password = password or settings.NEXTCLOUD_PASSWORD
        self.evidencias_path = settings.NEXTCLOUD_EVIDENCIAS_PATH
        
    @property
    def is_configured(self) -> bool:
        """Verifica si el servicio está configurado correctamente."""
        return bool(self.base_url and self.username and self.password)
    
    def _get_auth(self) -> tuple[str, str]:
        """Retorna tuple de autenticación básica."""
        return (self.username, self.password)
    
    def _sanitize_filename(self, name: str) -> str:
        """Sanitiza un nombre para usarlo como nombre de archivo/carpeta."""
        # Reemplazar caracteres problemáticos
        invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
        result = name
        for char in invalid_chars:
            result = result.replace(char, '_')
        return result.strip()
    
    async def ensure_folder_exists(self, folder_path: str) -> bool:
        """
        Crea una carpeta en Nextcloud si no existe.
        Usa MKCOL de WebDAV.
        
        Args:
            folder_path: Ruta relativa desde la raíz del usuario (e.g., "Evidencias_Liga/Quinto A")
            
        Returns:
            True si la carpeta existe o fue creada, False si hubo error.
        """
        if not self.is_configured:
            return False
            
        # Construir URL completa
        url = f"{self.base_url.rstrip('/')}/{folder_path}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Intentar crear la carpeta
                response = await client.request(
                    "MKCOL",
                    url,
                    auth=self._get_auth()
                )
                
                # 201 = Created, 405 = Already exists (Method Not Allowed on existing resource)
                if response.status_code in [201, 405]:
                    return True
                    
                print(f"[Nextcloud] Error creando carpeta {folder_path}: {response.status_code}")
                return False
                
            except httpx.RequestError as e:
                print(f"[Nextcloud] Error de conexión al crear carpeta: {e}")
                return False
    
    async def ensure_folder_path_recursive(self, folder_path: str) -> bool:
        """
        Crea toda la estructura de carpetas recursivamente.
        
        Args:
            folder_path: Ruta completa (e.g., "Evidencias_Liga/Quinto A/Nombre Alumno")
        """
        parts = folder_path.split('/')
        current_path = ""
        
        for part in parts:
            if not part:
                continue
            current_path = f"{current_path}/{part}" if current_path else part
            success = await self.ensure_folder_exists(current_path)
            if not success:
                # Puede fallar porque ya existe, continuamos
                pass
                
        return True
    
    async def upload_file(self, content: bytes, remote_path: str) -> bool:
        """
        Sube un archivo a Nextcloud via WebDAV PUT.
        
        Args:
            content: Contenido del archivo en bytes
            remote_path: Ruta remota completa incluyendo nombre del archivo
            
        Returns:
            True si se subió correctamente, False si hubo error.
        """
        if not self.is_configured:
            print("[Nextcloud] Servicio no configurado, saltando subida.")
            return False
            
        url = f"{self.base_url.rstrip('/')}/{remote_path}"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.put(
                    url,
                    content=content,
                    auth=self._get_auth(),
                    headers={"Content-Type": "application/pdf"}
                )
                
                if response.status_code in [200, 201, 204]:
                    print(f"[Nextcloud] ✅ Archivo subido: {remote_path}")
                    return True
                else:
                    print(f"[Nextcloud] ❌ Error subiendo archivo: {response.status_code} - {response.text}")
                    return False
                    
            except httpx.RequestError as e:
                print(f"[Nextcloud] ❌ Error de conexión: {e}")
                return False
    
    async def upload_evidence(
        self,
        pdf_content: bytes,
        liga_name: str,
        student_name: str,
        game_name: str
    ) -> bool:
        """
        Sube una evidencia (PDF de ficha de juego) a Nextcloud.
        Organiza automáticamente en carpetas por liga y alumno.
        
        Args:
            pdf_content: Contenido del PDF en bytes
            liga_name: Nombre de la liga (e.g., "Quinto C")
            student_name: Nombre del alumno (e.g., "Martina Suárez Piñeiro")
            game_name: Nombre del juego (e.g., "golpear en el sitio")
            
        Returns:
            True si se subió correctamente, False si hubo error.
        """
        if not self.is_configured:
            print("[Nextcloud] Servicio no configurado, saltando subida de evidencia.")
            return False
        
        # Sanitizar nombres
        safe_liga = self._sanitize_filename(liga_name)
        safe_student = self._sanitize_filename(student_name)
        safe_game = self._sanitize_filename(game_name)
        
        # Construir estructura de carpetas
        folder_path = f"{self.evidencias_path}/{safe_liga}/{safe_student}"
        
        # Crear carpetas si no existen
        await self.ensure_folder_path_recursive(folder_path)
        
        # Nombre del archivo con fecha
        today = date.today().isoformat()
        filename = f"Ficha_{safe_game}_{today}.pdf"
        
        # Ruta completa del archivo
        remote_path = f"{folder_path}/{filename}"
        
        # Subir archivo
        return await self.upload_file(pdf_content, remote_path)


# Instancia global del servicio (usada por defecto si no se inyecta otra)
# Mantenemos esto para retrocompatibilidad con scripts que importen `nextcloud_service`
nextcloud_service = NextcloudService()
