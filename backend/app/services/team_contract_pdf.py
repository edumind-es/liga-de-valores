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
PDF generator for team commitment contracts.
"""
import os
from io import BytesIO
from datetime import datetime
from typing import List, Optional

from PIL import Image as PILImage
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib import colors

# Constant paths (matching pdf_generator.py)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
STATIC_IMG_DIR = os.path.join(BACKEND_DIR, "static", "img")

EDUMIND_LOGO_PATH = os.path.join(STATIC_IMG_DIR, "edumind_logo.webp")
LIGA_LOGO_PATH = os.path.join(STATIC_IMG_DIR, "liga_logo.webp")

# Fallback for Docker
if not os.path.exists(EDUMIND_LOGO_PATH):
    EDUMIND_LOGO_PATH = "/app/static/img/edumind_logo.webp"
if not os.path.exists(LIGA_LOGO_PATH):
    LIGA_LOGO_PATH = "/app/static/img/liga_logo.webp"

def _load_logo_image(path: str, max_width: float, max_height: float) -> Optional[Image]:
    """
    Carga una imagen de logo, la redimensiona y la escala proporcionalmente.
    Helper copied from pdf_generator.py for consistency.
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


async def generate_team_contract_pdf(
    nombre_estudiante: str,
    equipo_nombre: str,
    liga_nombre: str,
    rol: str,
    compromisos: List[str]
) -> bytes:
    """
    Generate a PDF contract for team membership.
    
    Args:
        nombre_estudiante: Student name
        equipo_nombre: Team name
        liga_nombre: League name
        rol: Selected role
        compromisos: List of accepted commitments
        
    Returns:
        PDF content as bytes
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        alignment=TA_CENTER,
        spaceAfter=5,
        textColor=HexColor('#1a365d')
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=14,
        alignment=TA_CENTER,
        spaceAfter=15,
        textColor=HexColor('#2d3748')
    )
    
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading3'],
        fontSize=12,
        spaceBefore=20,
        spaceAfter=10,
        textColor=HexColor('#2b6cb0')
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=8,
        leading=14
    )
    
    commitment_style = ParagraphStyle(
        'Commitment',
        parent=styles['Normal'],
        fontSize=11,
        leftIndent=20,
        spaceAfter=6,
        leading=14
    )
    
    signature_style = ParagraphStyle(
        'Signature',
        parent=styles['Normal'],
        fontSize=11,
        alignment=TA_CENTER,
        spaceBefore=40
    )
    
    # Content
    story = []
    
    # ═══════════════════════════════════════════════════════════════════
    # HEADER WITH LOGOS
    # ═══════════════════════════════════════════════════════════════════
    edumind_logo = _load_logo_image(EDUMIND_LOGO_PATH, 25*mm, 25*mm)
    liga_logo = _load_logo_image(LIGA_LOGO_PATH, 25*mm, 25*mm)

    header_data = []
    if edumind_logo and liga_logo:
        # Logos on sides, Title in center
        header_data = [[edumind_logo, Paragraph("📋 Contrato de Compromiso Educativo", title_style), liga_logo]]
        header_table = Table(
            header_data,
            colWidths=[30*mm, 110*mm, 30*mm]
        )
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(header_table)
    elif edumind_logo:
         header_data = [[edumind_logo, Paragraph("📋 Contrato de Compromiso Educativo", title_style)]]
         header_table = Table(header_data, colWidths=[30*mm, 140*mm])
         header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
         ]))
         story.append(header_table)
    else:
        story.append(Paragraph("📋 Contrato de Compromiso Educativo", title_style))
    
    story.append(Paragraph(f"Liga EDUmind - {liga_nombre}", subtitle_style))
    
    # Separator line
    story.append(Table(
        [['']],
        colWidths=[170*mm],
        style=TableStyle([
            ('LINEBELOW', (0, 0), (-1, -1), 2, HexColor('#3b82f6'))
        ])
    ))
    story.append(Spacer(1, 4*mm))
    
    # Team and role info
    story.append(Paragraph("📌 Datos del Equipo", section_style))
    
    info_data = [
        ["Estudiante:", nombre_estudiante],
        ["Equipo:", equipo_nombre],
        ["Rol:", rol],
        ["Fecha:", datetime.now().strftime("%d/%m/%Y")]
    ]
    
    info_table = Table(info_data, colWidths=[4*cm, 10*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(info_table)
    
    # Commitments
    story.append(Spacer(1, 20))
    story.append(Paragraph("✅ Compromisos Aceptados", section_style))
    story.append(Paragraph(
        f"Como <b>{rol}</b> del equipo <b>{equipo_nombre}</b>, me comprometo a:",
        body_style
    ))
    
    for compromiso in compromisos:
        story.append(Paragraph(f"✓ {compromiso}", commitment_style))
    
    # Footer with signature and branding
    story.append(Spacer(1, 40))
    story.append(Paragraph("─" * 50, signature_style))
    story.append(Paragraph(f"<b>{nombre_estudiante}</b>", signature_style))
    
    story.append(Spacer(1, 20))
    
    # Separator line for footer
    story.append(Table(
        [['']],
        colWidths=[170*mm],
        style=TableStyle([
            ('LINEBELOW', (0, 0), (-1, -1), 1, HexColor('#e5e7eb'))
        ])
    ))
    story.append(Spacer(1, 3*mm))

    # Footer Branding
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
        f"Generado con Liga EDUmind • liga.edumind.es",
        footer_style
    ))
    story.append(Spacer(1, 1*mm))
    story.append(Paragraph(
        f"Diseñado por Luis Vilela Acuña",
        designer_style
    ))
    
    # Build PDF
    doc.build(story)
    
    return buffer.getvalue()
