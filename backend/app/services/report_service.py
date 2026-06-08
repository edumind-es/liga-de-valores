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

import csv
import io
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# Rutas de logos (idénticas a pdf_generator.py y team_contract_pdf.py)
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(os.path.dirname(_CURRENT_DIR))
_STATIC_IMG_DIR = os.path.join(_BACKEND_DIR, "static", "img")
_EDUMIND_LOGO_PATH = os.path.join(_STATIC_IMG_DIR, "edumind_logo.webp")
_LIGA_LOGO_PATH = os.path.join(_STATIC_IMG_DIR, "liga_logo.webp")
if not os.path.exists(_EDUMIND_LOGO_PATH):
    _EDUMIND_LOGO_PATH = "/app/static/img/edumind_logo.webp"
if not os.path.exists(_LIGA_LOGO_PATH):
    _LIGA_LOGO_PATH = "/app/static/img/liga_logo.webp"


def _load_logo(path: str, max_w: float, max_h: float):
    """Carga y escala un logo con PIL para reducir tamaño del PDF."""
    if not os.path.exists(path):
        return None
    try:
        from PIL import Image as PILImage
        buf = io.BytesIO()
        with PILImage.open(path) as img:
            aspect = img.width / img.height
            target_aspect = max_w / max_h
            if aspect > target_aspect:
                w_px, h_px = int(max_w * 4.2), int(max_w * 4.2 / aspect)
            else:
                w_px, h_px = int(max_h * 4.2 * aspect), int(max_h * 4.2)
            if img.width > w_px or img.height > h_px:
                if img.mode not in ("RGB", "RGBA"):
                    img = img.convert("RGBA")
                img = img.resize((w_px, h_px), PILImage.Resampling.LANCZOS)
            img.save(buf, format="PNG", optimize=True)
        buf.seek(0)
        rl_img = Image(buf)
        if aspect > max_w / max_h:
            rl_img.drawWidth, rl_img.drawHeight = max_w, max_w / aspect
        else:
            rl_img.drawWidth, rl_img.drawHeight = max_h * aspect, max_h
        return rl_img
    except Exception:
        return None


# Paleta EDUmind (misma que pdf_generator.py / team_contract_pdf.py)
_C_PRIMARY   = colors.HexColor("#1e40af")   # azul EDUmind
_C_SECONDARY = colors.HexColor("#059669")   # verde Liga
_C_ACCENT    = colors.HexColor("#3b82f6")   # azul claro
_C_DARK_HDR  = colors.HexColor("#1a365d")   # cabecera oscura tabla
_C_ROW_ALT   = colors.HexColor("#f0f4f8")   # fila alterna
_C_PIN_BG    = colors.HexColor("#fff9e6")   # fondo celda PIN
_C_PIN_FG    = colors.HexColor("#c47a00")   # texto PIN dorado
_C_GRID      = colors.HexColor("#d1d5db")   # bordes tabla
_C_FOOTER    = colors.HexColor("#6b7280")   # pie texto
_C_FOOTER2   = colors.HexColor("#9ca3af")   # pie subtexto
_C_SEP       = colors.HexColor("#e5e7eb")   # separador pie


def _build_edumind_header(titulo: str, subtitulo: str, page_w_mm: float, styles) -> list:
    """
    Genera los elementos de cabecera EDUmind:
    logo izq | título centrado | logo der + línea separadora + subtítulo.
    """
    edumind_logo = _load_logo(_EDUMIND_LOGO_PATH, 20 * mm, 20 * mm)
    liga_logo    = _load_logo(_LIGA_LOGO_PATH,    20 * mm, 20 * mm)

    inner_w = page_w_mm - 20  # descontando márgenes 10mm cada lado
    logo_col = 24 * mm
    center_col = (inner_w * mm) - 2 * logo_col

    title_style = ParagraphStyle(
        "EduHdrTitle",
        parent=styles["Heading1"],
        fontSize=16,
        textColor=_C_PRIMARY,
        alignment=TA_CENTER,
        spaceAfter=0,
        leading=20,
    )
    sub_style = ParagraphStyle(
        "EduHdrSub",
        parent=styles["Normal"],
        fontSize=8,
        textColor=_C_FOOTER,
        alignment=TA_CENTER,
        spaceAfter=0,
    )

    logo_l = edumind_logo if edumind_logo else Paragraph("", styles["Normal"])
    logo_r = liga_logo    if liga_logo    else Paragraph("", styles["Normal"])

    hdr_table = Table(
        [[logo_l, Paragraph(titulo, title_style), logo_r]],
        colWidths=[logo_col, center_col, logo_col],
    )
    hdr_table.setStyle(TableStyle([
        ("ALIGN",  (0, 0), (0, 0), "LEFT"),
        ("ALIGN",  (1, 0), (1, 0), "CENTER"),
        ("ALIGN",  (2, 0), (2, 0), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    sep = Table(
        [[""]],
        colWidths=[inner_w * mm],
        style=TableStyle([("LINEBELOW", (0, 0), (-1, -1), 2, _C_ACCENT)]),
    )

    return [
        hdr_table,
        Spacer(1, 2 * mm),
        sep,
        Spacer(1, 2 * mm),
        Paragraph(subtitulo, sub_style),
        Spacer(1, 4 * mm),
    ]


def _build_edumind_footer(page_w_mm: float, styles) -> list:
    """Pie de página EDUmind: separador + branding."""
    inner_w = page_w_mm - 20
    footer_style = ParagraphStyle(
        "EduFooter",
        parent=styles["Normal"],
        fontSize=7,
        textColor=_C_FOOTER,
        alignment=TA_CENTER,
    )
    designer_style = ParagraphStyle(
        "EduDesigner",
        parent=styles["Normal"],
        fontSize=6,
        textColor=_C_FOOTER2,
        alignment=TA_CENTER,
    )
    sep = Table(
        [[""]],
        colWidths=[inner_w * mm],
        style=TableStyle([("LINEABOVE", (0, 0), (-1, -1), 0.5, _C_SEP)]),
    )
    return [
        Spacer(1, 6 * mm),
        sep,
        Spacer(1, 2 * mm),
        Paragraph("Generado con Liga EDUmind  •  liga.edumind.es", footer_style),
        Spacer(1, 1 * mm),
        Paragraph("Diseñado por Luis Vilela Acuña", designer_style),
    ]

class ReportService:
    @staticmethod
    def generate_clasificacion_csv(clasificacion: list) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Headers
        headers = [
            "Posición", "Equipo", "PJ", "G", "E", "P", 
            "Puntos Deportivos", "Juego Limpio", "Respeto Árbitro", "Grada", 
            "Puntos Educativos", "TOTAL"
        ]
        writer.writerow(headers)
        
        for equipo in clasificacion:
            writer.writerow([
                equipo["posicion"],
                equipo["equipo_nombre"],
                equipo["partidos_jugados"],
                equipo["ganados"],
                equipo["empatados"],
                equipo["perdidos"],
                equipo["puntos_deportivos"],
                equipo["puntos_juego_limpio"],
                equipo["puntos_arbitro"],
                equipo["puntos_grada"],
                equipo["puntos_educativos_total"],
                equipo["puntos_totales"]
            ])
            
        return output.getvalue()

    @staticmethod
    def generate_clasificacion_pdf(liga_nombre: str, clasificacion: list) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'Title',
            parent=styles['Heading1'],
            alignment=TA_CENTER,
            spaceAfter=20
        )
        elements.append(Paragraph(f"Clasificación - {liga_nombre}", title_style))
        elements.append(Paragraph(f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
        elements.append(Spacer(1, 20))
        
        # Table Data
        data = [[
            "Pos", "Equipo", "PJ", "G", "E", "P", 
            "Dep", "JL", "Arb", "Gra", "Edu", "TOT"
        ]]
        
        for eq in clasificacion:
            data.append([
                str(eq["posicion"]),
                eq["equipo_nombre"][:20], # Truncate long names
                str(eq["partidos_jugados"]),
                str(eq["ganados"]),
                str(eq["empatados"]),
                str(eq["perdidos"]),
                str(eq["puntos_deportivos"]),
                str(eq["puntos_juego_limpio"]),
                str(eq["puntos_arbitro"]),
                str(eq["puntos_grada"]),
                str(eq["puntos_educativos_total"]),
                str(eq["puntos_totales"])
            ])
            
        # Table Style
        table = Table(data, colWidths=[30, 120, 25, 25, 25, 25, 30, 30, 30, 30, 30, 35])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'), # Align names left
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
        ]))
        
        elements.append(table)
        doc.build(elements)
        return buffer.getvalue()

    @staticmethod
    def generate_acta_partido_pdf(partido: dict) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        elements.append(Paragraph(f"Acta de Partido - {partido['tipo_deporte']['nombre']}", styles['Heading1']))
        elements.append(Spacer(1, 10))
        
        # Info
        elements.append(Paragraph(f"Fecha: {partido['fecha_hora'] or 'Pendiente'}", styles['Normal']))
        elements.append(Paragraph(f"Jornada: {partido['jornada_id']}", styles['Normal']))
        elements.append(Spacer(1, 20))
        
        # Score (marcador deportivo real + puntos de clasificación)
        marcador_local = partido.get('marcador_local', partido.get('puntos_local', 0))
        marcador_visitante = partido.get('marcador_visitante', partido.get('puntos_visitante', 0))

        score_data = [
            [partido['equipo_local']['nombre'], "VS", partido['equipo_visitante']['nombre']],
            [str(marcador_local), "-", str(marcador_visitante)],
            [f"Clasificación: {partido['puntos_local']}", "", f"Clasificación: {partido['puntos_visitante']}"],
        ]
        
        score_table = Table(score_data, colWidths=[200, 50, 200])
        score_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 14),
            ('FONTSIZE', (0, 1), (-1, 1), 24), # Big score
            ('FONTSIZE', (0, 2), (-1, 2), 10),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ]))
        elements.append(score_table)
        elements.append(Spacer(1, 30))
        
        modo_eval = partido.get('modo_evaluacion', 'clasico')
        slot_3_label = partido.get('slot_3_label') or 'Arbitro'
        slot_4_label = partido.get('slot_4_label') or 'Tutor de grada local'
        slot_5_label = partido.get('slot_5_label') or 'Tutor de grada visitante'
        grada_local_nombre = partido.get('grada_local_nombre') or 'Sin asignar'
        grada_visitante_nombre = partido.get('grada_visitante_nombre') or 'Sin asignar'

        # Evaluación educativa
        elements.append(Paragraph("Evaluación Educativa", styles['Heading2']))

        if modo_eval == 'personalizado' and partido.get('evaluacion_personalizada'):
            eval_data = [["Criterio", "Local", "Visitante"]]
            for criterio in partido.get('evaluacion_personalizada', []):
                nombre = criterio.get('nombre', 'Criterio')
                valor = criterio.get('valor')
                equipo_id = criterio.get('equipo_id')

                if equipo_id == partido.get('equipo_local_id'):
                    local_val = valor
                    visitante_val = "-"
                elif equipo_id == partido.get('equipo_visitante_id'):
                    local_val = "-"
                    visitante_val = valor
                else:
                    nombre = f"General: {nombre}"
                    local_val = valor
                    visitante_val = valor

                eval_data.append([
                    str(nombre),
                    "-" if local_val is None else str(local_val),
                    "-" if visitante_val is None else str(visitante_val),
                ])

            eval_table = Table(eval_data, colWidths=[260, 70, 70])
            eval_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ]))
            elements.append(eval_table)
            elements.append(Spacer(1, 10))

            resumen_data = [
                ["Resumen Educativo", "Local", "Visitante"],
                ["Puntos educativos (calculados)", str(partido.get('puntos_juego_limpio_local', 0)), str(partido.get('puntos_juego_limpio_visitante', 0))],
                [f"Puntos {slot_4_label}/{slot_5_label} (total)", str(partido.get('puntos_grada_local', 0)), str(partido.get('puntos_grada_visitante', 0))],
            ]
            resumen_table = Table(resumen_data, colWidths=[260, 70, 70])
            resumen_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ]))
            elements.append(resumen_table)
            elements.append(Spacer(1, 8))
            elements.append(Paragraph(f"{slot_4_label} evaluado por: {grada_local_nombre}", styles['Normal']))
            elements.append(Paragraph(f"{slot_5_label} evaluado por: {grada_visitante_nombre}", styles['Normal']))
        else:
            eval_data = [
                ["Criterio", "Local", "Visitante"],
                ["Juego Limpio (puntos)", str(partido.get('puntos_juego_limpio_local', 0)), str(partido.get('puntos_juego_limpio_visitante', 0))],
                [f"{slot_4_label}/{slot_5_label} (Animación)", str(partido.get('grada_animar_local', 0)), str(partido.get('grada_animar_visitante', 0))],
                [f"{slot_4_label}/{slot_5_label} (Respeto)", str(partido.get('grada_respeto_local', 0)), str(partido.get('grada_respeto_visitante', 0))],
                [f"{slot_4_label}/{slot_5_label} (Participación)", str(partido.get('grada_participacion_local', 0)), str(partido.get('grada_participacion_visitante', 0))],
                [f"Puntos {slot_4_label}/{slot_5_label} (total)", str(partido.get('puntos_grada_local', 0)), str(partido.get('puntos_grada_visitante', 0))],
            ]

            eval_table = Table(eval_data, colWidths=[200, 100, 100])
            eval_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ]))
            elements.append(eval_table)
            elements.append(Spacer(1, 8))
            elements.append(Paragraph(f"{slot_4_label} evaluado por: {grada_local_nombre}", styles['Normal']))
            elements.append(Paragraph(f"{slot_5_label} evaluado por: {grada_visitante_nombre}", styles['Normal']))

            arbitro_nombre = partido.get('arbitro_nombre') or '-'
            arbitro_media = partido.get('arbitro_media')
            arbitro_media_txt = '-' if arbitro_media is None else f"{arbitro_media:.2f}"
            puntos_arbitro = partido.get('puntos_arbitro', 0)
            elements.append(Spacer(1, 10))
            elements.append(Paragraph(f"{slot_3_label}: {arbitro_nombre}", styles['Normal']))
            elements.append(Paragraph(f"Evaluación {slot_3_label} (media): {arbitro_media_txt}", styles['Normal']))
            elements.append(Paragraph(f"Puntos {slot_3_label}: {puntos_arbitro}", styles['Normal']))

        doc.build(elements)
        return buffer.getvalue()

    # ─────────────────────────────────────────────────────────────────────
    # CALENDARIO DE PARTIDOS CON PINes
    # ─────────────────────────────────────────────────────────────────────

    @staticmethod
    def generate_pines_csv(liga_nombre: str, partidos: list) -> str:
        """CSV con partidos, roles y PINes para uso docente."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Jornada", "Fecha/Hora", "Deporte",
            "Equipo Local", "Equipo Visitante",
            "Árbitro", "Tutor Grada Local", "Tutor Grada Visitante",
            "PIN", "Estado",
        ])
        for p in partidos:
            writer.writerow([
                p.get("jornada_nombre", ""),
                p.get("fecha_hora", ""),
                p.get("deporte", ""),
                p.get("equipo_local", ""),
                p.get("equipo_visitante", ""),
                p.get("arbitro", "") or "",
                p.get("tutor_grada_local", "") or "",
                p.get("tutor_grada_visitante", "") or "",
                p.get("pin", "Sin PIN"),
                "Finalizado" if p.get("finalizado") else "Pendiente",
            ])
        return output.getvalue()

    @staticmethod
    def generate_pines_pdf(liga_nombre: str, partidos: list) -> bytes:
        """PDF A4 apaisado — diseño EDUmind — con calendario de partidos y PINes para imprimir."""
        from reportlab.lib.pagesizes import landscape

        PAGE_W_MM = 297  # A4 apaisado
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            leftMargin=10 * mm,
            rightMargin=10 * mm,
            topMargin=12 * mm,
            bottomMargin=12 * mm,
        )
        styles = getSampleStyleSheet()
        elements = []

        # ── Cabecera EDUmind ────────────────────────────────────────────
        subtitulo = (
            f"Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}"
            f"  ·  {len(partidos)} partido(s)"
            f"  ·  Documento de uso interno docente"
        )
        elements += _build_edumind_header(
            f"Calendario de Partidos — {liga_nombre}",
            subtitulo,
            PAGE_W_MM,
            styles,
        )

        # ── Tabla de partidos ───────────────────────────────────────────
        col_style = ParagraphStyle("ps", parent=styles["Normal"], fontSize=7, leading=9)
        pin_style = ParagraphStyle(
            "ps_pin", parent=styles["Normal"],
            fontSize=14, fontName="Helvetica-Bold",
            alignment=TA_CENTER, textColor=_C_PIN_FG,
        )
        hdr_style = ParagraphStyle(
            "ps_hdr", parent=styles["Normal"],
            fontSize=7, fontName="Helvetica-Bold",
            alignment=TA_CENTER, textColor=colors.white,
        )

        headers = [
            "Jornada", "Fecha/Hora", "Deporte",
            "Local", "Visitante",
            "Árbitro", "Grada Local", "Grada Visit.",
            "PIN", "Est.",
        ]
        data = [[Paragraph(h, hdr_style) for h in headers]]

        for p in partidos:
            pin_val = p.get("pin") or "—"
            estado = "OK" if p.get("finalizado") else "·"
            data.append([
                Paragraph(p.get("jornada_nombre", ""), col_style),
                Paragraph(p.get("fecha_hora", ""), col_style),
                Paragraph(p.get("deporte", ""), col_style),
                Paragraph(p.get("equipo_local", ""), col_style),
                Paragraph(p.get("equipo_visitante", ""), col_style),
                Paragraph(p.get("arbitro") or "—", col_style),
                Paragraph(p.get("tutor_grada_local") or "—", col_style),
                Paragraph(p.get("tutor_grada_visitante") or "—", col_style),
                Paragraph(pin_val, pin_style),
                Paragraph(estado, col_style),
            ])

        # A4 apaisado: 297mm - 10 - 10 = 277mm disponibles; total 267mm
        col_widths = [24, 26, 20, 36, 36, 30, 27, 27, 30, 11]
        table = Table(data, colWidths=[w * mm for w in col_widths], repeatRows=1)
        table.setStyle(TableStyle([
            # Cabecera
            ("BACKGROUND",   (0, 0), (-1, 0), _C_DARK_HDR),
            ("TEXTCOLOR",    (0, 0), (-1, 0), colors.white),
            ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN",        (0, 0), (-1, 0), "CENTER"),
            ("BOTTOMPADDING",(0, 0), (-1, 0), 5),
            ("TOPPADDING",   (0, 0), (-1, 0), 5),
            # Filas alternas
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _C_ROW_ALT]),
            # Celda PIN destacada
            ("BACKGROUND", (8, 1), (8, -1), _C_PIN_BG),
            ("ALIGN",      (8, 0), (8, -1), "CENTER"),
            # Estado
            ("ALIGN",      (9, 0), (9, -1), "CENTER"),
            # Grid y padding
            ("GRID",    (0, 0), (-1, -1), 0.4, _C_GRID),
            ("VALIGN",  (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING",  (0, 0), (-1, -1), 3),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3),
            ("TOPPADDING",   (0, 1), (-1, -1), 4),
            ("BOTTOMPADDING",(0, 1), (-1, -1), 4),
            # Borde exterior acento azul
            ("BOX", (0, 0), (-1, -1), 1.2, _C_ACCENT),
        ]))
        elements.append(table)

        # Nota LOPD
        elements.append(Spacer(1, 3 * mm))
        elements.append(Paragraph(
            "⚠ Los PINes son de uso interno. No compartas este documento fuera del equipo docente. "
            "Los nombres de equipos no deben contener datos personales de menores (LOPD/RGPD).",
            ParagraphStyle("lopd_note", parent=styles["Normal"], fontSize=6.5,
                           textColor=_C_FOOTER, alignment=TA_CENTER),
        ))

        # ── Pie EDUmind ─────────────────────────────────────────────────
        elements += _build_edumind_footer(PAGE_W_MM, styles)

        doc.build(elements)
        return buffer.getvalue()

    @staticmethod
    def generate_estadisticas_csv(liga_nombre: str, partidos: list) -> str:
        """
        CSV de datos estadísticos por partido para análisis matemático en clase.
        Columnas diseñadas para calcular medias, totales y gráficos en Excel/Sheets.
        """
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Liga", "Jornada", "Nº Jornada", "Fecha/Hora", "Deporte",
            "Equipo Local", "Equipo Visitante",
            "Árbitro", "Tutor Grada Local", "Tutor Grada Visitante",
            "Marcador Local", "Marcador Visitante", "Resultado",
            "Puntos Deportivos Local", "Puntos Deportivos Visitante",
            "Juego Limpio Local", "Juego Limpio Visitante",
            "Puntos Árbitro", "Puntos Grada Local", "Puntos Grada Visitante",
            "Media Árbitro", "Estado",
        ])
        for p in partidos:
            writer.writerow([
                liga_nombre,
                p.get("jornada_nombre", ""),
                p.get("jornada_numero", ""),
                p.get("fecha_hora", ""),
                p.get("deporte", ""),
                p.get("equipo_local", ""),
                p.get("equipo_visitante", ""),
                p.get("arbitro", "") or "",
                p.get("tutor_grada_local", "") or "",
                p.get("tutor_grada_visitante", "") or "",
                p.get("marcador_local", 0),
                p.get("marcador_visitante", 0),
                p.get("resultado", ""),
                p.get("puntos_local", 0),
                p.get("puntos_visitante", 0),
                p.get("puntos_jl_local", 0),
                p.get("puntos_jl_visitante", 0),
                p.get("puntos_arbitro", 0),
                p.get("puntos_grada_local", 0),
                p.get("puntos_grada_visitante", 0),
                p.get("arbitro_media", ""),
                "Finalizado" if p.get("finalizado") else "Pendiente",
            ])
        return output.getvalue()

    @staticmethod
    def generate_estadisticas_pdf(liga_nombre: str, partidos: list) -> bytes:
        """PDF A4 apaisado — diseño EDUmind — con estadísticas de partidos para matemáticas."""
        from reportlab.lib.pagesizes import landscape

        PAGE_W_MM = 297
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            leftMargin=10 * mm,
            rightMargin=10 * mm,
            topMargin=12 * mm,
            bottomMargin=12 * mm,
        )
        styles = getSampleStyleSheet()
        elements = []

        # ── Cabecera EDUmind ────────────────────────────────────────────
        subtitulo = (
            f"Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}"
            f"  ·  {len(partidos)} partido(s)"
            f"  ·  Datos para análisis estadístico en clase"
        )
        elements += _build_edumind_header(
            f"Estadísticas de Partidos — {liga_nombre}",
            subtitulo,
            PAGE_W_MM,
            styles,
        )

        # ── Tabla de estadísticas ───────────────────────────────────────
        col_style = ParagraphStyle("es_cell", parent=styles["Normal"], fontSize=6, leading=8)
        hdr_style = ParagraphStyle(
            "es_hdr", parent=styles["Normal"],
            fontSize=6, fontName="Helvetica-Bold",
            alignment=TA_CENTER, textColor=colors.white,
        )
        num_style = ParagraphStyle(
            "es_num", parent=styles["Normal"],
            fontSize=6.5, alignment=TA_CENTER,
        )
        # Cabeceras con abreviaturas claras
        headers = [
            "Jornada", "Fecha", "Local", "Visitante",
            "Ml", "Mv", "Res",
            "PDl", "PDv",
            "JLl", "JLv",
            "Arb", "Grl", "Grv",
            "ØArb", "Est",
        ]
        data = [[Paragraph(h, hdr_style) for h in headers]]

        for p in partidos:
            estado = "OK" if p.get("finalizado") else "·"
            data.append([
                Paragraph(p.get("jornada_nombre", ""), col_style),
                Paragraph(p.get("fecha_hora", ""), col_style),
                Paragraph(p.get("equipo_local", ""), col_style),
                Paragraph(p.get("equipo_visitante", ""), col_style),
                Paragraph(str(p.get("marcador_local", 0)), num_style),
                Paragraph(str(p.get("marcador_visitante", 0)), num_style),
                Paragraph(p.get("resultado", ""), num_style),
                Paragraph(str(p.get("puntos_local", 0)), num_style),
                Paragraph(str(p.get("puntos_visitante", 0)), num_style),
                Paragraph(str(p.get("puntos_jl_local", 0)), num_style),
                Paragraph(str(p.get("puntos_jl_visitante", 0)), num_style),
                Paragraph(str(p.get("puntos_arbitro", 0)), num_style),
                Paragraph(str(p.get("puntos_grada_local", 0)), num_style),
                Paragraph(str(p.get("puntos_grada_visitante", 0)), num_style),
                Paragraph(str(p.get("arbitro_media", "")), num_style),
                Paragraph(estado, num_style),
            ])

        # 277mm disponibles; total 267mm
        col_widths = [26, 24, 38, 38, 10, 10, 9, 11, 11, 10, 10, 10, 10, 10, 12, 10]
        table = Table(data, colWidths=[w * mm for w in col_widths], repeatRows=1)
        table.setStyle(TableStyle([
            # Cabecera
            ("BACKGROUND",    (0, 0), (-1, 0), _C_DARK_HDR),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("ALIGN",         (0, 0), (-1, 0), "CENTER"),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
            ("TOPPADDING",    (0, 0), (-1, 0), 4),
            # Filas alternas
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _C_ROW_ALT]),
            # Columnas numéricas centradas (desde Ml hasta Est)
            ("ALIGN",  (4, 1), (-1, -1), "CENTER"),
            # Columnas de puntos educativos con fondo tenue verde
            ("BACKGROUND", (9, 1), (13, -1), colors.HexColor("#f0fdf4")),
            # Grid y padding
            ("GRID",    (0, 0), (-1, -1), 0.4, _C_GRID),
            ("VALIGN",  (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING",  (0, 0), (-1, -1), 2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING",   (0, 1), (-1, -1), 3),
            ("BOTTOMPADDING",(0, 1), (-1, -1), 3),
            # Borde exterior acento secundario verde
            ("BOX", (0, 0), (-1, -1), 1.2, _C_SECONDARY),
        ]))
        elements.append(table)

        # Leyenda de columnas
        elements.append(Spacer(1, 3 * mm))
        leyenda = (
            "Ml/Mv = Marcador local/visitante  ·  PDl/PDv = Puntos deportivos  ·  "
            "JLl/JLv = Juego Limpio  ·  Arb = Puntos árbitro  ·  Grl/Grv = Puntos grada  ·  ØArb = Media árbitro"
        )
        elements.append(Paragraph(
            leyenda,
            ParagraphStyle("leyenda", parent=styles["Normal"], fontSize=6,
                           textColor=_C_FOOTER, alignment=TA_CENTER),
        ))

        # ── Pie EDUmind ─────────────────────────────────────────────────
        elements += _build_edumind_footer(PAGE_W_MM, styles)

        doc.build(elements)
        return buffer.getvalue()
