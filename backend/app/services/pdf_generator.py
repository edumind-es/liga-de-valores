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
Servicio de generación de PDFs para fichas de juegos.
Genera PDFs estructurados a partir de datos de GameSubmission.
Soporta múltiples idiomas (Castellano, Galego, Inglés).
"""

from io import BytesIO
from typing import Optional, List
import httpx
import os
from PIL import Image as PILImage
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib import colors


# URL base para pictogramas ARASAAC
ARASAAC_BASE_URL = "https://static.arasaac.org/pictograms"

# Rutas de logos
# Determinar ruta base relativa al archivo actual (backend/app/services/pdf_generator.py)
# Queremos llegar a backend/static/img
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
STATIC_IMG_DIR = os.path.join(BACKEND_DIR, "static", "img")

EDUMIND_LOGO_PATH = os.path.join(STATIC_IMG_DIR, "edumind_logo.webp")
LIGA_LOGO_PATH = os.path.join(STATIC_IMG_DIR, "liga_logo.webp")

# Fallback para entorno Docker estricto si la ruta relativa falla
if not os.path.exists(EDUMIND_LOGO_PATH):
    EDUMIND_LOGO_PATH = "/app/static/img/edumind_logo.webp"
if not os.path.exists(LIGA_LOGO_PATH):
    LIGA_LOGO_PATH = "/app/static/img/liga_logo.webp"

# Traducciones multiidioma
TRANSLATIONS = {
    "es": {
        "game_sheet": "Ficha de Juego",
        "author": "Autor",
        "anonymous": "Anónimo",
        "sport": "Deporte",
        "league": "Liga",
        "materials": "Materiales necesarios",
        "rules": "Reglas y Descripción",
        "graphic": "Representación Gráfica",
        "image_error": "Error al cargar la imagen",
        "picto_credit": "Pictogramas de ARASAAC (arasaac.org)",
        "footer_generated": "Generado con Liga EDUmind",
        "footer_designer": "Diseñado por Luis Vilela Acuña",
        "footer_url": "liga.edumind.es",
    },
    "gl": {
        "game_sheet": "Ficha de Xogo",
        "author": "Autor",
        "anonymous": "Anónimo",
        "sport": "Deporte",
        "league": "Liga",
        "materials": "Materiais necesarios",
        "rules": "Regras e Descrición",
        "graphic": "Representación Gráfica",
        "image_error": "Erro ao cargar a imaxe",
        "picto_credit": "Pictogramas de ARASAAC (arasaac.org)",
        "footer_generated": "Xerado con Liga EDUmind",
        "footer_designer": "Deseñado por Luis Vilela Acuña",
        "footer_url": "liga.edumind.es",
    },
    "en": {
        "game_sheet": "Game Sheet",
        "author": "Author",
        "anonymous": "Anonymous",
        "sport": "Sport",
        "league": "League",
        "materials": "Required Materials",
        "rules": "Rules and Description",
        "graphic": "Graphic Representation",
        "image_error": "Error loading image",
        "picto_credit": "Pictograms from ARASAAC (arasaac.org)",
        "footer_generated": "Generated with Liga EDUmind",
        "footer_designer": "Designed by Luis Vilela Acuña",
        "footer_url": "liga.edumind.es",
    },
}


def get_translations(lang: str = "es") -> dict:
    """Obtiene las traducciones para el idioma especificado."""
    return TRANSLATIONS.get(lang, TRANSLATIONS["es"])


async def fetch_pictogram_image(picto_id: int) -> Optional[bytes]:
    """Descarga una imagen de pictograma de ARASAAC y la comprime."""
    url = f"{ARASAAC_BASE_URL}/{picto_id}/{picto_id}_500.png"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                # Comprimir pictograma
                return compress_image(response.content, max_size=150, quality=70)
    except Exception:
        pass
    return None


def compress_image(image_bytes: bytes, max_size: int = 800, quality: int = 75) -> bytes:
    """
    Comprime una imagen para reducir el tamaño del PDF.
    
    Args:
        image_bytes: Bytes de la imagen original
        max_size: Tamaño máximo del lado más largo en píxeles
        quality: Calidad JPEG (1-100)
    
    Returns:
        bytes: Imagen comprimida en formato JPEG
    """
    try:
        img = PILImage.open(BytesIO(image_bytes))
        
        # Convertir a RGB si es necesario (para PNG con transparencia)
        if img.mode in ('RGBA', 'P'):
            # Crear fondo blanco para transparencias
            background = PILImage.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Redimensionar si es muy grande
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, PILImage.Resampling.LANCZOS)
        
        # Guardar como JPEG comprimido
        output = BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        return output.getvalue()
        
    except Exception as e:
        print(f"[PDF] Error comprimiendo imagen: {e}")
        return image_bytes  # Devolver original si falla


def _load_logo_image(path: str, max_width: float, max_height: float) -> Optional[Image]:
    """
    Carga una imagen de logo, la redimensiona y la escala proporcionalmente.
    Reducir el tamaño de la imagen ANTES de pasarla a ReportLab reduce drásticamente
    el tamaño del PDF final.
    """
    if not os.path.exists(path):
        return None
    try:
        # Abrir con PIL para manipular
        with PILImage.open(path) as pil_img:
            # Calcular tamaño objetivo en píxeles (asumiendo 300 DPI para impresión)
            # 1 punto = 1/72 pulgada. DPI = 300.
            # Factor de conversión: 300 / 72 ≈ 4.16
            dpi_factor = 4.2
            target_w_px = int(max_width * dpi_factor)
            target_h_px = int(max_height * dpi_factor)

            # Mantener aspecto original
            img_aspect = pil_img.width / pil_img.height
            target_aspect = target_w_px / target_h_px

            if img_aspect > target_aspect:
                # La imagen es más ancha, limitar por ancho
                final_w_px = target_w_px
                final_h_px = int(target_w_px / img_aspect)
            else:
                # La imagen es más alta, limitar por alto
                final_h_px = target_h_px
                final_w_px = int(target_h_px * img_aspect)

            # Redimensionar solo si la original es más grande
            if pil_img.width > final_w_px or pil_img.height > final_h_px:
                # Convertir a modo compatible si es necesario (mantener transparencia)
                if pil_img.mode not in ('RGB', 'RGBA'):
                    pil_img = pil_img.convert('RGBA')
                
                pil_img = pil_img.resize((final_w_px, final_h_px), PILImage.Resampling.LANCZOS)

            # Guardar en buffer optimizado
            img_buffer = BytesIO()
            # Usar PNG para preservar transparencia de logos
            pil_img.save(img_buffer, format='PNG', optimize=True)
            img_buffer.seek(0)

            # Crear imagen de ReportLab desde el buffer
            img = Image(img_buffer)
            
            # Configurar dimensiones de dibujo (tamaño físico en el PDF)
            # Esto es independiente de los píxeles reales de la imagen
            if img_aspect > target_aspect:
                img.drawWidth = max_width
                img.drawHeight = max_width / img_aspect
            else:
                img.drawHeight = max_height
                img.drawWidth = max_height * img_aspect

            return img
    except Exception as e:
        print(f"Error cargando logo {path}: {e}")
        return None


async def fetch_pictograms_bulk(ids: List[int]) -> dict:
    """
    Descarga en paralelo todos los pictogramas de la lista y devuelve
    un diccionario {id: bytes}. Útil para exportaciones masivas.
    """
    import asyncio

    async def fetch_one(picto_id: int) -> tuple[int, Optional[bytes]]:
        data = await fetch_pictogram_image(picto_id)
        return picto_id, data

    results = await asyncio.gather(*[fetch_one(pid) for pid in ids], return_exceptions=True)
    cache: dict[int, bytes] = {}
    for result in results:
        if isinstance(result, tuple):
            pid, data = result
            if data:
                cache[pid] = data
    return cache


async def generate_game_sheet_pdf(
    title: str,
    student_name: Optional[str] = None,
    sport_name: Optional[str] = None,
    liga_name: Optional[str] = None,
    materiales: Optional[str] = None,
    reglas: Optional[str] = None,
    graphics_content: Optional[bytes] = None,
    pictos_materiales: Optional[List[int]] = None,
    pictos_reglas: Optional[List[int]] = None,
    is_anonymous: bool = False,
    language: str = "es",
    picto_cache: Optional[dict] = None,  # {id: bytes} — evita re-descargar en exportaciones masivas
) -> bytes:
    """
    Genera un PDF estructurado de ficha de juego.

    Args:
        title: Nombre del juego
        student_name: Nombre del alumno (None si es anónimo)
        sport_name: Nombre del deporte asociado
        liga_name: Nombre de la liga
        materiales: Descripción de materiales
        reglas: Reglas y descripción del juego
        graphics_content: Bytes de la imagen de representación gráfica
        pictos_materiales: Lista de IDs de pictogramas para materiales
        pictos_reglas: Lista de IDs de pictogramas para reglas
        is_anonymous: Si es True, omite el nombre del alumno
        language: Código de idioma (es, gl, en)

    Returns:
        bytes: Contenido del PDF generado
    """

    # Obtener traducciones
    t = get_translations(language)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=15*mm,
        bottomMargin=20*mm
    )

    # Colores de marca
    primary_color = colors.HexColor('#1e40af')  # Azul EDUmind
    secondary_color = colors.HexColor('#059669')  # Verde Liga
    accent_color = colors.HexColor('#3b82f6')  # Azul claro

    # Estilos
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_CENTER
    )

    title_style = ParagraphStyle(
        'GameTitle',
        parent=styles['Heading1'],
        fontSize=22,
        textColor=primary_color,
        alignment=TA_CENTER,
        spaceAfter=8*mm
    )

    game_name_style = ParagraphStyle(
        'GameName',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#111827'),
        alignment=TA_CENTER,
        spaceAfter=4*mm
    )

    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#4b5563'),
        alignment=TA_CENTER,
        spaceAfter=5*mm
    )

    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=13,
        textColor=secondary_color,
        spaceBefore=6*mm,
        spaceAfter=3*mm,
        borderPadding=2*mm
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        spaceAfter=3*mm
    )

    # Construir contenido
    story = []

    # ═══════════════════════════════════════════════════════════════════
    # CABECERA CON LOGOS
    # ═══════════════════════════════════════════════════════════════════

    # Cargar logos
    edumind_logo = _load_logo_image(EDUMIND_LOGO_PATH, 25*mm, 25*mm)
    liga_logo = _load_logo_image(LIGA_LOGO_PATH, 25*mm, 25*mm)

    # Crear cabecera con logos a los lados y título en el centro
    header_data = []
    if edumind_logo and liga_logo:
        header_data = [[edumind_logo, Paragraph(f"🎮 {t['game_sheet']}", title_style), liga_logo]]
        header_table = Table(
            header_data,
            colWidths=[30*mm, 120*mm, 30*mm]
        )
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(header_table)
    elif edumind_logo:
        header_data = [[edumind_logo, Paragraph(f"🎮 {t['game_sheet']}", title_style), '']]
        header_table = Table(
            header_data,
            colWidths=[30*mm, 120*mm, 30*mm]
        )
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(header_table)
    else:
        story.append(Paragraph(f"🎮 {t['game_sheet']}", title_style))

    story.append(Spacer(1, 3*mm))

    # Nombre del juego
    story.append(Paragraph(f"<b>{title}</b>", game_name_style))

    # Info de autor/deporte/liga
    meta_parts = []
    if is_anonymous or not student_name:
        meta_parts.append(f"{t['author']}: {t['anonymous']}")
    else:
        meta_parts.append(f"{t['author']}: {student_name}")

    if sport_name:
        meta_parts.append(f"{t['sport']}: {sport_name}")

    if liga_name:
        meta_parts.append(f"{t['league']}: {liga_name}")

    story.append(Paragraph(" | ".join(meta_parts), subtitle_style))
    story.append(Spacer(1, 3*mm))

    # Línea separadora con gradiente visual
    story.append(Table(
        [['']],
        colWidths=[180*mm],
        style=TableStyle([
            ('LINEBELOW', (0, 0), (-1, -1), 2, accent_color)
        ])
    ))
    story.append(Spacer(1, 4*mm))
    
    # ═══════════════════════════════════════════════════════════════════
    # MATERIALES
    # ═══════════════════════════════════════════════════════════════════
    if materiales:
        story.append(Paragraph(f"📦 {t['materials']}", section_style))
        story.append(Paragraph(materiales.replace('\n', '<br/>'), body_style))

        # Pictogramas de materiales - RENDERIZAR IMÁGENES REALES
        if pictos_materiales and len(pictos_materiales) > 0:
            story.append(Spacer(1, 3*mm))
            picto_images = []
            for picto_id in pictos_materiales[:6]:  # Máximo 6 pictogramas
                img_bytes = (picto_cache or {}).get(picto_id) or await fetch_pictogram_image(picto_id)
                if img_bytes:
                    try:
                        img_buffer = BytesIO(img_bytes)
                        img = Image(img_buffer, width=22*mm, height=22*mm)
                        picto_images.append(img)
                    except Exception:
                        pass

            if picto_images:
                # Crear tabla con pictogramas en fila
                picto_table = Table(
                    [picto_images],
                    colWidths=[26*mm] * len(picto_images)
                )
                picto_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 1*mm),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 1*mm),
                ]))
                story.append(picto_table)
                story.append(Paragraph(
                    f"<i>{t['picto_credit']}</i>",
                    ParagraphStyle('PictoNote', parent=styles['Normal'], fontSize=7, textColor=colors.gray)
                ))

    # ═══════════════════════════════════════════════════════════════════
    # REGLAS Y DESCRIPCIÓN
    # ═══════════════════════════════════════════════════════════════════
    if reglas:
        story.append(Paragraph(f"📜 {t['rules']}", section_style))
        story.append(Paragraph(reglas.replace('\n', '<br/>'), body_style))

        # Pictogramas de reglas - RENDERIZAR IMÁGENES REALES
        if pictos_reglas and len(pictos_reglas) > 0:
            story.append(Spacer(1, 3*mm))
            picto_images = []
            for picto_id in pictos_reglas[:6]:  # Máximo 6 pictogramas
                img_bytes = (picto_cache or {}).get(picto_id) or await fetch_pictogram_image(picto_id)
                if img_bytes:
                    try:
                        img_buffer = BytesIO(img_bytes)
                        img = Image(img_buffer, width=22*mm, height=22*mm)
                        picto_images.append(img)
                    except Exception:
                        pass

            if picto_images:
                picto_table = Table(
                    [picto_images],
                    colWidths=[26*mm] * len(picto_images)
                )
                picto_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 1*mm),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 1*mm),
                ]))
                story.append(picto_table)
                story.append(Paragraph(
                    f"<i>{t['picto_credit']}</i>",
                    ParagraphStyle('PictoNote', parent=styles['Normal'], fontSize=7, textColor=colors.gray)
                ))

    # ═══════════════════════════════════════════════════════════════════
    # REPRESENTACIÓN GRÁFICA
    # ═══════════════════════════════════════════════════════════════════
    if graphics_content:
        story.append(Paragraph(f"🎨 {t['graphic']}", section_style))
        try:
            # Comprimir imagen del alumno (principal fuente de tamaño grande)
            compressed_graphics = compress_image(graphics_content, max_size=1200, quality=75)
            img_buffer = BytesIO(compressed_graphics)
            img = Image(img_buffer)

            # Escalar imagen para que quepa en el ancho
            max_width = 160*mm
            max_height = 90*mm

            aspect = img.imageWidth / img.imageHeight
            if img.imageWidth > max_width:
                img.drawWidth = max_width
                img.drawHeight = max_width / aspect
            else:
                img.drawWidth = img.imageWidth
                img.drawHeight = img.imageHeight

            if img.drawHeight > max_height:
                img.drawHeight = max_height
                img.drawWidth = max_height * aspect

            story.append(img)
        except Exception:
            story.append(Paragraph(f"<i>{t['image_error']}</i>", body_style))

    # ═══════════════════════════════════════════════════════════════════
    # PIE DE PÁGINA CON BRANDING
    # ═══════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 8*mm))

    # Línea separadora
    story.append(Table(
        [['']],
        colWidths=[180*mm],
        style=TableStyle([
            ('LINEBELOW', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb'))
        ])
    ))
    story.append(Spacer(1, 3*mm))

    # Footer con información de marca
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_CENTER
    )

    designer_style = ParagraphStyle(
        'Designer',
        parent=styles['Normal'],
        fontSize=7,
        textColor=colors.HexColor('#9ca3af'),
        alignment=TA_CENTER
    )

    story.append(Paragraph(
        f"{t['footer_generated']} • {t['footer_url']}",
        footer_style
    ))
    story.append(Spacer(1, 1*mm))
    story.append(Paragraph(
        f"{t['footer_designer']}",
        designer_style
    ))

    # Construir PDF
    doc.build(story)

    return buffer.getvalue()


async def generate_wiki_pdf(submission, language: str = "es") -> bytes:
    """
    Genera PDF desde un objeto GameSubmission para descarga en Wiki.
    Siempre es anónimo.

    Args:
        submission: Objeto GameSubmission
        language: Código de idioma (es, gl, en) - se obtiene de la config de la liga
    """
    graphics_content = None
    if submission.representacion_grafica:
        try:
            with open(submission.representacion_grafica, 'rb') as f:
                graphics_content = f.read()
        except Exception:
            pass

    # Obtener nombre del deporte si hay relación
    sport_name = None
    if hasattr(submission, 'sport') and submission.sport:
        sport_name = submission.sport.nombre

    # Obtener nombre de la liga si hay relación
    liga_name = None
    liga_language = language
    if hasattr(submission, 'liga') and submission.liga:
        liga_name = submission.liga.nombre
        # Obtener idioma de la configuración de la liga
        if submission.liga.config:
            config = submission.liga.config
            if isinstance(config, str):
                import json
                try:
                    config = json.loads(config)
                except Exception:
                    config = {}
            liga_language = config.get("submission_language", "es")
            if liga_language == "all":
                liga_language = "es"  # Default a español si es "all"

    return await generate_game_sheet_pdf(
        title=submission.title,
        student_name=None,  # Siempre anónimo
        sport_name=sport_name,
        liga_name=liga_name,
        materiales=submission.materiales,
        reglas=submission.reglas,
        graphics_content=graphics_content,
        pictos_materiales=submission.pictogramas_materiales,
        pictos_reglas=submission.pictogramas_reglas,
        is_anonymous=True,
        language=liga_language
    )

