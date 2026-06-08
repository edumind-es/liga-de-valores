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
API de recursos de juegos - Wiki de Fichas de Juegos
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Query, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from datetime import datetime, timezone
from io import BytesIO
import os

from app.database import get_db
from app.api.deps import get_current_superuser, get_current_active_user
from app.models.game_submission import GameSubmission
from app.models.liga import Liga
from app.models.tipo_deporte import TipoDeporte
from app.models.user import User
from app.services.pdf_generator import generate_wiki_pdf, generate_game_sheet_pdf, fetch_pictograms_bulk

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLICACIÓN DE FICHAS (Enlaces del email al docente)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/publish/{token_hash}", response_class=HTMLResponse)
async def show_publish_page(
    token_hash: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Muestra la página de confirmación de publicación.
    El docente puede elegir si incluir su nombre como contribuidor.
    """
    result = await db.execute(
        select(GameSubmission).where(GameSubmission.token_hash == token_hash)
    )
    submission = result.scalar_one_or_none()
    
    if not submission:
        return _error_page("Enlace no válido", "El código de activación no existe o ha caducado.")
    
    if submission.is_public:
        return _success_page(
            "¡Ya estaba publicado!",
            f'El juego "{submission.title}" ya es visible en la Wiki de Juegos.',
            show_wiki_link=True
        )
    
    # Mostrar página de confirmación con formulario
    # Obtener taxonomías para los selectores
    from app.models.taxonomia_pedagogica import TaxonomiaPedagogica
    tax_result = await db.execute(
        select(TaxonomiaPedagogica).order_by(TaxonomiaPedagogica.categoria, TaxonomiaPedagogica.orden)
    )
    taxonomias = tax_result.scalars().all()
    
    # Agrupar por categoría
    tax_groups = {}
    for t in taxonomias:
        if t.categoria not in tax_groups:
            tax_groups[t.categoria] = []
        tax_groups[t.categoria].append(t)
    
    # Nombres de categorías
    cat_names = {
        "famose": "Tipo de Tarea (Famose)",
        "sanchez_banuelos": "Estrategia en Práctica (Sánchez Bañuelos)",
        "mosston": "Estilo de Enseñanza (Mosston & Ashworth)",
        "nivel_iniciacion": "Nivel de Iniciación Deportiva"
    }
    
    # Generar HTML para los selectores
    def render_select(cat_key, cat_name, options):
        opts_html = f'<option value="">-- Seleccionar {cat_name.split("(")[0].strip()} --</option>'
        for opt in options:
            opts_html += f'<option value="{opt.id}">{opt.nombre}</option>'
        return f'''
        <div class="tax-group">
            <label for="tax_{cat_key}">{cat_name}</label>
            <select name="taxonomia_{cat_key}" id="tax_{cat_key}">
                {opts_html}
            </select>
        </div>
        '''
    
    taxonomia_selects = ""
    for cat_key in ["famose", "sanchez_banuelos", "mosston", "nivel_iniciacion"]:
        if cat_key in tax_groups:
            taxonomia_selects += render_select(cat_key, cat_names.get(cat_key, cat_key), tax_groups[cat_key])
    
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Publicar en Wiki - Liga EDUmind</title>
        <style>
            * {{ box-sizing: border-box; margin: 0; padding: 0; }}
            body {{
                font-family: 'Segoe UI', system-ui, sans-serif;
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }}
            .card {{
                background: white;
                border-radius: 16px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                max-width: 600px;
                width: 100%;
                padding: 40px;
            }}
            .icon {{ font-size: 48px; margin-bottom: 20px; text-align: center; }}
            h1 {{ color: #1e3a8a; margin-bottom: 10px; font-size: 24px; text-align: center; }}
            .game-title {{ 
                color: #3b82f6; 
                font-size: 20px; 
                font-weight: 600;
                margin-bottom: 20px;
                padding: 10px;
                background: #eff6ff;
                border-radius: 8px;
                text-align: center;
            }}
            p {{ color: #64748b; line-height: 1.6; margin-bottom: 15px; text-align: center; }}
            .form-group {{
                margin: 20px 0;
                text-align: left;
                padding: 15px;
                background: #f8fafc;
                border-radius: 8px;
            }}
            .taxonomias-section {{
                margin: 25px 0;
                padding: 20px;
                background: #f0f9ff;
                border-radius: 10px;
                border: 1px solid #bae6fd;
            }}
            .taxonomias-section h3 {{
                color: #0369a1;
                font-size: 16px;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 8px;
            }}
            .tax-group {{
                margin-bottom: 15px;
            }}
            .tax-group label {{
                display: block;
                font-size: 13px;
                font-weight: 600;
                color: #475569;
                margin-bottom: 5px;
            }}
            .tax-group select {{
                width: 100%;
                padding: 10px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                font-size: 14px;
                background: white;
            }}
            .tax-group select:focus {{
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }}
            label {{
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
                color: #334155;
            }}
            input[type="checkbox"] {{
                width: 20px;
                height: 20px;
                accent-color: #3b82f6;
            }}
            input[type="text"] {{
                width: 100%;
                padding: 10px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                margin-top: 10px;
                font-size: 14px;
            }}
            input[type="text"]:focus {{
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }}
            .btn {{
                display: inline-block;
                padding: 14px 28px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                border: none;
                transition: all 0.2s;
                width: 100%;
            }}
            .btn-primary {{
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
            }}
            .btn-primary:hover {{ transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); }}
            .warning {{
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 8px;
                padding: 12px;
                font-size: 13px;
                color: #92400e;
                margin-top: 20px;
                text-align: center;
            }}
            .optional-badge {{
                font-size: 11px;
                background: #e2e8f0;
                color: #64748b;
                padding: 2px 8px;
                border-radius: 10px;
                margin-left: 5px;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">🎮</div>
            <h1>Publicar en la Wiki de Juegos</h1>
            <div class="game-title">"{submission.title}"</div>
            
            <p>
                Al publicar, esta ficha será visible para toda la comunidad educativa.
                La versión publicada es <strong>completamente anónima</strong>.
            </p>
            
            <form action="/api/v1/game-resources/confirm-publish/{token_hash}" method="POST">
                <!-- Taxonomías Pedagógicas -->
                <div class="taxonomias-section">
                    <h3>📚 Clasificación Pedagógica <span class="optional-badge">Opcional</span></h3>
                    <p style="font-size: 13px; margin-bottom: 15px; text-align: left;">
                        Ayuda a otros docentes a encontrar este juego clasificándolo pedagógicamente:
                    </p>
                    {taxonomia_selects}
                </div>
                
                <!-- Atribución Docente -->
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="incluir_atribucion" id="chkAtribucion" onchange="toggleNombre()">
                        Incluir mi nombre como docente contribuidor
                    </label>
                    <input type="text" name="docente_nombre" id="inputNombre" 
                           placeholder="Tu nombre (ej: Prof. García)" 
                           style="display: none;">
                </div>
                
                <button type="submit" class="btn btn-primary">
                    ✅ Confirmar Publicación
                </button>
            </form>
            
            <div class="warning">
                ⚠️ Esta acción no se puede deshacer. Una vez publicado, el juego
                permanecerá visible en la wiki.
            </div>
        </div>
        
        <script>
            function toggleNombre() {{
                const chk = document.getElementById('chkAtribucion');
                const input = document.getElementById('inputNombre');
                input.style.display = chk.checked ? 'block' : 'none';
                if (chk.checked) input.focus();
            }}
        </script>
    </body>
    </html>
    """


@router.post("/confirm-publish/{token_hash}", response_class=HTMLResponse)
async def confirm_publish(
    request: Request,
    token_hash: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Confirma la publicación de una ficha en la Wiki.
    Procesa las taxonomías pedagógicas seleccionadas.
    """
    from app.models.taxonomia_pedagogica import GameSubmissionTaxonomia
    
    # Obtener datos del formulario
    form_data = await request.form()
    incluir_atribucion = form_data.get("incluir_atribucion") == "on"
    docente_nombre = form_data.get("docente_nombre")
    
    # Obtener taxonomías seleccionadas
    taxonomia_ids = []
    for key in ["taxonomia_famose", "taxonomia_sanchez_banuelos", "taxonomia_mosston", "taxonomia_nivel_iniciacion"]:
        value = form_data.get(key)
        if value:
            try:
                taxonomia_ids.append(int(value))
            except ValueError:
                pass
    
    result = await db.execute(
        select(GameSubmission).where(GameSubmission.token_hash == token_hash)
    )
    submission = result.scalar_one_or_none()
    
    if not submission:
        return _error_page("Enlace no válido", "El código de activación no existe o ha caducado.")
    
    if submission.is_public:
        return _success_page(
            "¡Ya estaba publicado!",
            f'El juego "{submission.title}" ya es visible en la Wiki de Juegos.',
            show_wiki_link=True
        )
    
    # Actualizar registro
    submission.is_public = True
    submission.published_at = datetime.now(timezone.utc)
    
    if incluir_atribucion and docente_nombre:
        submission.docente_nombre = docente_nombre.strip()
    
    # Guardar taxonomías seleccionadas
    for tax_id in taxonomia_ids:
        relation = GameSubmissionTaxonomia(
            game_submission_id=submission.id,
            taxonomia_id=tax_id
        )
        db.add(relation)
    
    await db.commit()
    
    # Mensaje de éxito con info de taxonomías
    tax_count = len(taxonomia_ids)
    tax_msg = f" Se asignaron {tax_count} clasificaciones pedagógicas." if tax_count > 0 else ""
    
    return _success_page(
        "¡Publicado con éxito!",
        f'El juego "{submission.title}" ha sido añadido a la Wiki de Juegos.{tax_msg} '
        'Gracias por contribuir a la comunidad educativa.',
        show_wiki_link=True
    )


# ═══════════════════════════════════════════════════════════════════════════════
# WIKI PÚBLICA DE JUEGOS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/repository")
async def list_repository_games(db: AsyncSession = Depends(get_db)):
    """
    Compatibility endpoint for the public repository page.
    Returns a lightweight list of anonymous public games.
    """
    query = (
        select(GameSubmission)
        .where(GameSubmission.is_public == True)
        .order_by(
            GameSubmission.published_at.desc().nullslast(),
            GameSubmission.created_at.desc(),
        )
    )

    result = await db.execute(query)
    submissions = result.scalars().all()

    return [
        {
            "id": sub.id,
            "title": sub.title,
            "sport_name": sub.sport.nombre if sub.sport else None,
            "created_at": (
                sub.published_at or sub.created_at
            ).isoformat() if (sub.published_at or sub.created_at) else None,
        }
        for sub in submissions
    ]

@router.get("/wiki")
async def list_wiki_games(
    sport_id: Optional[int] = Query(None, description="Filtrar por deporte"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoría: alternativo, popular, tradicional, convencional"),
    taxonomia_id: Optional[int] = Query(None, description="Filtrar por taxonomía pedagógica"),
    search: Optional[str] = Query(None, description="Buscar en título"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista las fichas de juego públicas con filtros y paginación.
    """
    from app.models.taxonomia_pedagogica import GameSubmissionTaxonomia
    
    # Base query
    query = select(GameSubmission).where(GameSubmission.is_public == True)
    
    # Filtro por deporte
    if sport_id:
        query = query.where(GameSubmission.sport_id == sport_id)
    
    # Filtro por categoría (requiere join con TipoDeporte)
    if categoria:
        query = query.join(TipoDeporte, GameSubmission.sport_id == TipoDeporte.id)
        query = query.where(TipoDeporte.categoria == categoria)
    
    # Filtro por taxonomía pedagógica
    if taxonomia_id:
        query = query.join(
            GameSubmissionTaxonomia,
            GameSubmission.id == GameSubmissionTaxonomia.game_submission_id
        ).where(GameSubmissionTaxonomia.taxonomia_id == taxonomia_id)
    
    # Filtro por búsqueda en título
    if search:
        query = query.where(GameSubmission.title.ilike(f"%{search}%"))
    
    # Ordenar por fecha de publicación
    query = query.order_by(GameSubmission.published_at.desc())
    
    # Contar total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Paginación
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    submissions = result.scalars().all()
    
    # Formatear respuesta
    items = []
    for sub in submissions:
        # Obtener nombre del deporte
        sport_name = None
        sport_categoria = None
        if sub.sport_id:
            sport = await db.get(TipoDeporte, sub.sport_id)
            if sport:
                sport_name = sport.nombre
                sport_categoria = sport.categoria
        
        items.append({
            "id": sub.id,
            "title": sub.title,
            "sport_id": sub.sport_id,
            "sport_name": sport_name,
            "sport_categoria": sport_categoria,
            "docente_nombre": sub.docente_nombre,
            "has_graphics": bool(sub.representacion_grafica),
            "has_pictograms": bool(sub.pictogramas_materiales or sub.pictogramas_reglas),
            "published_at": sub.published_at.isoformat() if sub.published_at else None
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/wiki/{ficha_id}")
async def get_wiki_game_detail(
    ficha_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene el detalle completo de una ficha de juego.
    """
    submission = await db.get(GameSubmission, ficha_id)
    
    if not submission:
        raise HTTPException(status_code=404, detail="Ficha no encontrada")
    
    if not submission.is_public:
        raise HTTPException(status_code=403, detail="Esta ficha aún no ha sido publicada")
    
    # Obtener info del deporte
    sport_name = None
    sport_categoria = None
    if submission.sport_id:
        sport = await db.get(TipoDeporte, submission.sport_id)
        if sport:
            sport_name = sport.nombre
            sport_categoria = sport.categoria
    
    return {
        "id": submission.id,
        "title": submission.title,
        "sport_id": submission.sport_id,
        "sport_name": sport_name,
        "sport_categoria": sport_categoria,
        "materiales": submission.materiales,
        "reglas": submission.reglas,
        "pictogramas_materiales": submission.pictogramas_materiales,
        "pictogramas_reglas": submission.pictogramas_reglas,
        "has_graphics": bool(submission.representacion_grafica),
        "docente_nombre": submission.docente_nombre,
        "published_at": submission.published_at.isoformat() if submission.published_at else None,
        "taxonomias": [
            {
                "id": t.id,
                "categoria": t.categoria,
                "nombre": t.nombre,
                "descripcion": t.descripcion
            }
            for t in submission.taxonomias
        ] if hasattr(submission, 'taxonomias') else []
    }


@router.get("/wiki/{ficha_id}/pdf")
async def download_wiki_game_pdf(
    ficha_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Genera y descarga el PDF de una ficha de juego.
    """
    submission = await db.get(GameSubmission, ficha_id)
    
    if not submission:
        raise HTTPException(status_code=404, detail="Ficha no encontrada")
    
    if not submission.is_public:
        raise HTTPException(status_code=403, detail="Esta ficha aún no ha sido publicada")
    
    # Generar PDF
    pdf_content = await generate_wiki_pdf(submission)
    
    # Retornar como descarga
    filename = f"Ficha_{submission.title.replace(' ', '_')}.pdf"
    
    return StreamingResponse(
        BytesIO(pdf_content),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/download-anonymous/{ficha_id}")
async def download_anonymous_game_pdf(
    ficha_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Legacy-compatible alias for anonymous repository downloads.
    """
    return await download_wiki_game_pdf(ficha_id=ficha_id, db=db)


@router.get("/wiki/{ficha_id}/graphics")
async def get_wiki_game_graphics(
    ficha_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene la imagen de representación gráfica de una ficha.
    """
    submission = await db.get(GameSubmission, ficha_id)
    
    if not submission:
        raise HTTPException(status_code=404, detail="Ficha no encontrada")
    
    if not submission.is_public:
        raise HTTPException(status_code=403, detail="Esta ficha aún no ha sido publicada")
    
    if not submission.representacion_grafica:
        raise HTTPException(status_code=404, detail="Esta ficha no tiene representación gráfica")
    
    if not os.path.exists(submission.representacion_grafica):
        raise HTTPException(status_code=404, detail="Archivo de imagen no encontrado")
    
    # Determinar tipo MIME
    ext = submission.representacion_grafica.split('.')[-1].lower()
    mime_types = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
        'gif': 'image/gif'
    }
    media_type = mime_types.get(ext, 'image/png')
    
    with open(submission.representacion_grafica, 'rb') as f:
        content = f.read()
    
    return StreamingResponse(
        BytesIO(content),
        media_type=media_type
    )


@router.get("/categorias")
async def list_sport_categories(db: AsyncSession = Depends(get_db)):
    """
    Lista las categorías de deportes disponibles con conteo de fichas.
    """
    # Obtener categorías únicas con conteo
    query = select(
        TipoDeporte.categoria,
        func.count(GameSubmission.id).label('count')
    ).outerjoin(
        GameSubmission,
        (GameSubmission.sport_id == TipoDeporte.id) & (GameSubmission.is_public == True)
    ).where(
        TipoDeporte.categoria.isnot(None)
    ).group_by(
        TipoDeporte.categoria
    )
    
    result = await db.execute(query)
    categories = result.fetchall()
    
    # Mapeo de nombres legibles
    category_names = {
        'alternativo': '🎯 Deportes Alternativos',
        'popular': '🏃 Deportes Populares',
        'tradicional': '🎪 Deportes Tradicionales',
        'convencional': '⚽ Deportes Convencionales'
    }
    
    return [
        {
            "codigo": cat.categoria,
            "nombre": category_names.get(cat.categoria, cat.categoria),
            "count": cat.count
        }
        for cat in categories
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# PANEL DOCENTE — fichas recibidas por liga
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/ligas/{liga_id}/fichas")
async def list_fichas_by_liga(
    liga_id: int,
    email_enviado: Optional[bool] = Query(None, description="Filtrar por estado de email"),
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lista las fichas recibidas en una liga. Solo accesible por el propietario de la liga.
    """
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    if liga.usuario_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Sin acceso a esta liga")

    query = select(GameSubmission).where(GameSubmission.liga_id == liga_id)
    if email_enviado is not None:
        query = query.where(GameSubmission.email_enviado == email_enviado)
    query = query.order_by(GameSubmission.created_at.desc())

    # Total para paginación
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * limit
    result = await db.execute(query.offset(offset).limit(limit))
    submissions = result.scalars().all()

    items = []
    for sub in submissions:
        sport_name = sub.sport.nombre if sub.sport else None
        items.append({
            "id": sub.id,
            "title": sub.title,
            "sport_name": sport_name,
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
            "email_enviado": sub.email_enviado,
            "email_error": sub.email_error,
            "is_public": sub.is_public,
            "moderation_required": sub.moderation_required,
            "has_graphics": bool(sub.representacion_grafica),
        })

    # Resumen rápido de la liga
    total_ok = (await db.execute(
        select(func.count()).where(
            GameSubmission.liga_id == liga_id,
            GameSubmission.email_enviado == True,
        )
    )).scalar() or 0
    total_fail = (await db.execute(
        select(func.count()).where(
            GameSubmission.liga_id == liga_id,
            GameSubmission.email_enviado == False,
        )
    )).scalar() or 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "summary": {
            "total": total_ok + total_fail,
            "email_ok": total_ok,
            "email_fail": total_fail,
        },
    }


@router.get("/ligas/{liga_id}/fichas/{ficha_id}/pdf")
async def download_ficha_docente_pdf(
    liga_id: int,
    ficha_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Descarga el PDF de una ficha (vista docente, sin nombre alumno).
    Solo accesible por el propietario de la liga.
    """
    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    if liga.usuario_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Sin acceso a esta liga")

    submission = await db.get(GameSubmission, ficha_id)
    if not submission or submission.liga_id != liga_id:
        raise HTTPException(status_code=404, detail="Ficha no encontrada")

    sport_name = submission.sport.nombre if submission.sport else None
    pdf_content = await generate_game_sheet_pdf(
        title=submission.title,
        student_name="(Anónimo)",
        sport_name=sport_name,
        liga_name=liga.nombre,
        materiales=submission.materiales or "",
        reglas=submission.reglas or "",
        graphics_content=None,
        pictos_materiales=submission.pictogramas_materiales,
        pictos_reglas=submission.pictogramas_reglas,
        is_anonymous=True,
        language="es",
    )

    filename = f"Ficha_{submission.title.replace(' ', '_')}.pdf"
    return StreamingResponse(
        BytesIO(pdf_content),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/ligas/{liga_id}/fichas/{ficha_id}/resend-email", status_code=202)
async def resend_ficha_email(
    liga_id: int,
    ficha_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reenvía el email de una ficha al docente. Útil para fichas con email_enviado=False.
    """
    from app.api.v1.tools import _send_email_and_log
    from app.services.pdf_generator import generate_game_sheet_pdf as gen_pdf

    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    if liga.usuario_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Sin acceso a esta liga")
    if not liga.email_fichas:
        raise HTTPException(status_code=400, detail="La liga no tiene email configurado")

    submission = await db.get(GameSubmission, ficha_id)
    if not submission or submission.liga_id != liga_id:
        raise HTTPException(status_code=404, detail="Ficha no encontrada")

    sport_name = submission.sport.nombre if submission.sport else None
    pdf_content = await gen_pdf(
        title=submission.title,
        student_name="(Reenvío — alumno/a)",
        sport_name=sport_name,
        liga_name=liga.nombre,
        materiales=submission.materiales or "",
        reglas=submission.reglas or "",
        graphics_content=None,
        pictos_materiales=submission.pictogramas_materiales,
        pictos_reglas=submission.pictogramas_reglas,
        is_anonymous=False,
        language="es",
    )

    api_url = os.getenv("API_URL", "https://liga.edumind.es/api/v1")
    publish_link = f"{api_url}/game-resources/publish/{submission.token_hash}"
    subject = f"[REENVÍO] Ficha de Juego: {submission.title}"
    body = f"""
    Hola Docente,

    Este es un REENVÍO de una ficha que no llegó correctamente antes.

    📝 DATOS DE LA FICHA:
    • Juego: {submission.title}
    • Liga: {liga.nombre}
    {f'• Deporte: {sport_name}' if sport_name else ''}
    • Fecha original: {submission.created_at.strftime('%d/%m/%Y %H:%M') if submission.created_at else 'desconocida'}

    👉 PUBLICAR EN WIKI: {publish_link}

    Liga EDUmind
    """
    filename = f"Ficha_{submission.title.replace(' ', '_')}.pdf"

    # Marcar email_enviado=False antes del reenvío para que el wrapper lo actualice
    submission.email_enviado = False
    submission.email_error = None
    await db.commit()

    background_tasks.add_task(
        _send_email_and_log,
        submission_id=submission.id,
        to_email=liga.email_fichas,
        subject=subject,
        body=body,
        file_content=pdf_content,
        filename=filename,
    )

    return {"message": "Reenvío en proceso. El email llegará en breve."}


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTACIÓN MASIVA — ZIP de todos los PDFs de una liga
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/ligas/{liga_id}/fichas/export-zip")
async def export_fichas_zip(
    liga_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Genera y descarga un ZIP con todos los PDFs de las fichas de la liga.
    Organizado en carpetas por liga. Optimizado con caché de pictogramas.
    """
    import zipfile
    import asyncio
    from datetime import date

    liga = await db.get(Liga, liga_id)
    if not liga:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    if liga.usuario_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Sin acceso a esta liga")

    result = await db.execute(
        select(GameSubmission)
        .where(GameSubmission.liga_id == liga_id)
        .order_by(GameSubmission.created_at.asc())
    )
    submissions = result.scalars().all()

    if not submissions:
        raise HTTPException(status_code=404, detail="Esta liga no tiene fichas aún.")

    # ── 1. Recopilar todos los IDs de pictogramas únicos ──────────────────────
    all_picto_ids: set[int] = set()
    for sub in submissions:
        if sub.pictogramas_materiales:
            all_picto_ids.update(sub.pictogramas_materiales[:6])
        if sub.pictogramas_reglas:
            all_picto_ids.update(sub.pictogramas_reglas[:6])

    # ── 2. Descargar todos los pictogramas en paralelo (1 sola vez) ───────────
    picto_cache: dict[int, bytes] = {}
    if all_picto_ids:
        picto_cache = await fetch_pictograms_bulk(list(all_picto_ids))

    # ── 3. Nombre seguro para rutas ZIP ───────────────────────────────────────
    def safe_name(s: str) -> str:
        for ch in r'/\:*?"<>|':
            s = s.replace(ch, "_")
        return s.strip()[:60]

    liga_folder = safe_name(liga.nombre)
    today = date.today().isoformat()

    # ── 4. Generar PDFs y empaquetar en ZIP ───────────────────────────────────
    zip_buffer = BytesIO()
    seen_names: dict[str, int] = {}

    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for sub in submissions:
            sport_name = sub.sport.nombre if sub.sport else None

            # Leer imagen desde disco si existe
            graphics_content = None
            if sub.representacion_grafica and os.path.exists(sub.representacion_grafica):
                try:
                    with open(sub.representacion_grafica, "rb") as img_f:
                        graphics_content = img_f.read()
                except Exception:
                    pass

            try:
                pdf_bytes = await generate_game_sheet_pdf(
                    title=sub.title,
                    student_name=None,
                    sport_name=sport_name,
                    liga_name=liga.nombre,
                    materiales=sub.materiales or "",
                    reglas=sub.reglas or "",
                    graphics_content=graphics_content,
                    pictos_materiales=sub.pictogramas_materiales,
                    pictos_reglas=sub.pictogramas_reglas,
                    is_anonymous=True,
                    language="es",
                    picto_cache=picto_cache,
                )
            except Exception as exc:
                print(f"[export-zip] Error generando PDF para submission {sub.id}: {exc}")
                continue

            # Nombre de archivo único dentro del ZIP
            base_name = safe_name(sub.title) or f"ficha_{sub.id}"
            if base_name in seen_names:
                seen_names[base_name] += 1
                file_name = f"{base_name}_{seen_names[base_name]}.pdf"
            else:
                seen_names[base_name] = 1
                file_name = f"{base_name}.pdf"

            zip_path = f"{liga_folder}/{file_name}"
            zf.writestr(zip_path, pdf_bytes)

    zip_buffer.seek(0)
    zip_filename = f"Fichas_{liga_folder}_{today}.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'},
    )


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTACIÓN DE DATOS (Moodle)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/export/csv")
async def export_games_csv(
    liga_id: Optional[int] = Query(None, description="Filtrar por liga"),
    current_user: User = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db)
):
    """
    Exporta las fichas de juego en formato CSV para importar en actividad Base de Datos de Moodle.
    Campos: titulo, autor, deporte, liga, materiales, reglas, fecha_creacion, pdf_url
    """
    from app.models.liga import Liga
    import csv
    from io import StringIO

    # Keep explicit for readability in logs and future audit trails.
    _ = current_user
    
    # Base query
    query = select(GameSubmission).where(GameSubmission.is_public == True)
    
    if liga_id:
        query = query.where(GameSubmission.liga_id == liga_id)
        
    # Ordenar por fecha
    query = query.order_by(GameSubmission.created_at.desc())
    
    result = await db.execute(query)
    submissions = result.scalars().all()
    
    # Preparar CSV
    output = StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)
    
    # Cabeceras (nombres de campo para Moodle Database)
    writer.writerow([
        "titulo", 
        "autor", 
        "deporte", 
        "liga", 
        "materiales", 
        "reglas", 
        "fecha_creacion", 
        "pdf_url"
    ])
    
    api_url = os.getenv("API_URL", "https://liga.edumind.es/api/v1")
    
    for sub in submissions:
        # Obtener nombres relacionados
        sport_name = ""
        if sub.sport_id:
            sport = await db.get(TipoDeporte, sub.sport_id)
            if sport:
                sport_name = sport.nombre
                
        liga_name = ""
        if sub.liga_id:
            liga = await db.get(Liga, sub.liga_id)
            if liga:
                liga_name = liga.nombre
                
        # Link al PDF público
        pdf_url = f"{api_url}/game-resources/wiki/{sub.id}/pdf"
        
        writer.writerow([
            sub.title,
            sub.docente_nombre or "Anónimo",  # Usar nombre docente si existe
            sport_name,
            liga_name,
            sub.materiales or "",
            sub.reglas or "",
            sub.created_at.strftime("%Y-%m-%d %H:%M:%S") if sub.created_at else "",
            pdf_url
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="juegos_export_{datetime.now().strftime("%Y%m%d")}.csv"'
        }
    )


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _error_page(title: str, message: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title} - Liga EDUmind</title>
        <style>
            body {{
                font-family: 'Segoe UI', system-ui, sans-serif;
                background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }}
            .card {{
                background: white;
                border-radius: 16px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                max-width: 400px;
                width: 100%;
                padding: 40px;
                text-align: center;
            }}
            .icon {{ font-size: 48px; margin-bottom: 20px; }}
            h1 {{ color: #dc2626; margin-bottom: 15px; }}
            p {{ color: #64748b; line-height: 1.6; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">❌</div>
            <h1>{title}</h1>
            <p>{message}</p>
        </div>
    </body>
    </html>
    """


def _success_page(title: str, message: str, show_wiki_link: bool = False) -> str:
    wiki_link = ""
    if show_wiki_link:
        wiki_link = '''
        <a href="https://liga.edumind.es/wiki-juegos" class="btn">
            🌐 Ver Wiki de Juegos
        </a>
        '''
    
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title} - Liga EDUmind</title>
        <style>
            body {{
                font-family: 'Segoe UI', system-ui, sans-serif;
                background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }}
            .card {{
                background: white;
                border-radius: 16px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                max-width: 400px;
                width: 100%;
                padding: 40px;
                text-align: center;
            }}
            .icon {{ font-size: 48px; margin-bottom: 20px; }}
            h1 {{ color: #059669; margin-bottom: 15px; }}
            p {{ color: #64748b; line-height: 1.6; margin-bottom: 20px; }}
            .btn {{
                display: inline-block;
                padding: 12px 24px;
                background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
                color: white;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 600;
            }}
            .btn:hover {{ transform: translateY(-2px); }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">✅</div>
            <h1>{title}</h1>
            <p>{message}</p>
            {wiki_link}
        </div>
    </body>
    </html>
    """
