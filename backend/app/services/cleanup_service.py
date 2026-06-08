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
Servicio de limpieza automática para fichas de juegos pendientes.

Este servicio gestiona:
1. Envío de avisos a docentes con fichas pendientes de 30+ días
2. Eliminación de fichas con 45+ días sin activar (después del aviso)

Ejecutar vía cron job diario.
"""

import asyncio
import os
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, and_

from app.models.game_submission import GameSubmission
from app.services.email_service import send_email

# Configuración de tiempos (en días)
DIAS_PARA_AVISO = 30
DIAS_PARA_ELIMINAR = 45


async def get_db_session():
    """Crea una sesión de base de datos."""
    database_url = os.getenv("DATABASE_URL")
    engine = create_async_engine(database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return async_session()


async def enviar_avisos_fichas_pendientes():
    """
    Envía avisos a docentes con fichas pendientes de 30+ días.
    Solo envía a fichas que no han recibido aviso previo.
    """
    db = await get_db_session()
    
    try:
        fecha_limite = datetime.now(timezone.utc) - timedelta(days=DIAS_PARA_AVISO)
        
        # Buscar fichas pendientes sin aviso enviado
        query = select(GameSubmission).where(
            and_(
                GameSubmission.is_public == False,
                GameSubmission.aviso_enviado == False,
                GameSubmission.created_at <= fecha_limite
            )
        )
        
        result = await db.execute(query)
        fichas_pendientes = result.scalars().all()
        
        if not fichas_pendientes:
            print(f"[Cleanup] No hay fichas pendientes que requieran aviso.")
            return
        
        print(f"[Cleanup] Encontradas {len(fichas_pendientes)} fichas pendientes para avisar.")
        
        # Agrupar por email de docente
        fichas_por_docente = {}
        for ficha in fichas_pendientes:
            email = ficha.docente_email
            if email:
                if email not in fichas_por_docente:
                    fichas_por_docente[email] = []
                fichas_por_docente[email].append(ficha)
        
        # Enviar un email por docente
        for email, fichas in fichas_por_docente.items():
            await _enviar_aviso_docente(email, fichas, db)
        
        await db.commit()
        print(f"[Cleanup] Avisos enviados a {len(fichas_por_docente)} docentes.")
        
    except Exception as e:
        print(f"[Cleanup] Error enviando avisos: {e}")
        await db.rollback()
    finally:
        await db.close()


async def _enviar_aviso_docente(email: str, fichas: list, db: AsyncSession):
    """Envía aviso de próxima eliminación a un docente."""
    
    dias_restantes = DIAS_PARA_ELIMINAR - DIAS_PARA_AVISO
    
    lista_juegos = "\n".join([f"  • {f.title}" for f in fichas])
    api_url = os.getenv("API_URL", "https://liga.edumind.es/api/v1")
    
    subject = f"⏰ Wiki de Juegos: {len(fichas)} ficha(s) pendiente(s) de publicar"
    body = f"""
Hola,

Tienes {len(fichas)} ficha(s) de juego esperando ser publicadas en la Wiki de Liga EDUmind.

Juegos pendientes:
{lista_juegos}

⏳ PRÓXIMA ELIMINACIÓN EN {dias_restantes} DÍAS

Las fichas que no sean publicadas serán eliminadas automáticamente
para mantener el sistema limpio y cumplir con la protección de datos.

Para publicar una ficha, busca el email original que recibiste con el
enlace de publicación, o contacta con soporte si lo has perdido.

----
Liga EDUmind - Wiki de Juegos
https://liga.edumind.es/wiki-juegos
    """
    
    try:
        await send_email(
            to_email=email,
            subject=subject,
            body=body
        )
        
        # Marcar fichas como avisadas
        for ficha in fichas:
            ficha.aviso_enviado = True
            ficha.fecha_aviso = datetime.now(timezone.utc)
        
        print(f"[Cleanup] Aviso enviado a {email} ({len(fichas)} fichas)")
    except Exception as e:
        print(f"[Cleanup] Error enviando aviso a {email}: {e}")


async def eliminar_fichas_expiradas():
    """
    Elimina fichas con 45+ días sin activar que ya recibieron aviso.
    También elimina los archivos asociados (imágenes, PDFs).
    """
    db = await get_db_session()
    
    try:
        fecha_limite = datetime.now(timezone.utc) - timedelta(days=DIAS_PARA_ELIMINAR)
        
        # Buscar fichas expiradas (ya avisadas)
        query = select(GameSubmission).where(
            and_(
                GameSubmission.is_public == False,
                GameSubmission.aviso_enviado == True,
                GameSubmission.created_at <= fecha_limite
            )
        )
        
        result = await db.execute(query)
        fichas_expiradas = result.scalars().all()
        
        if not fichas_expiradas:
            print(f"[Cleanup] No hay fichas expiradas para eliminar.")
            return
        
        print(f"[Cleanup] Encontradas {len(fichas_expiradas)} fichas expiradas para eliminar.")
        
        eliminadas = 0
        for ficha in fichas_expiradas:
            try:
                # Eliminar archivo de representación gráfica si existe
                if ficha.representacion_grafica and os.path.exists(ficha.representacion_grafica):
                    os.remove(ficha.representacion_grafica)
                    print(f"[Cleanup] Eliminada imagen: {ficha.representacion_grafica}")
                
                # Eliminar archivo PDF legacy si existe
                if ficha.file_path and os.path.exists(ficha.file_path):
                    os.remove(ficha.file_path)
                    print(f"[Cleanup] Eliminado PDF: {ficha.file_path}")
                
                # Eliminar registro de BD
                await db.delete(ficha)
                eliminadas += 1
                
            except Exception as e:
                print(f"[Cleanup] Error eliminando ficha {ficha.id}: {e}")
        
        await db.commit()
        print(f"[Cleanup] Eliminadas {eliminadas} fichas expiradas.")
        
    except Exception as e:
        print(f"[Cleanup] Error en limpieza: {e}")
        await db.rollback()
    finally:
        await db.close()


async def run_cleanup():
    """Ejecuta el proceso completo de limpieza."""
    print(f"[Cleanup] Iniciando limpieza - {datetime.now()}")
    
    # 1. Primero enviamos avisos
    await enviar_avisos_fichas_pendientes()
    
    # 2. Luego eliminamos las expiradas
    await eliminar_fichas_expiradas()
    
    print(f"[Cleanup] Limpieza completada - {datetime.now()}")


# Para ejecutar manualmente o desde cron
if __name__ == "__main__":
    asyncio.run(run_cleanup())
