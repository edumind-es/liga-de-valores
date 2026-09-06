#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
# Author: Luis Vilela Acuña
#
# SPDX-License-Identifier: AGPL-3.0-or-later
#

"""Páginas HTML de resultado (éxito/error) del flujo de publicación de fichas."""


def error_page(title: str, message: str) -> str:
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


def success_page(title: str, message: str, show_wiki_link: bool = False) -> str:
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

