# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versión semántica.

## [3.0.1] — 2026-09-26

Corrección tras la evaluación VCER del 2026-09-25 (de «No recomendable», 40 %, a «Recomendable»).

### Eliminado
- Analítica Matomo en todas las rutas (`main.tsx`, `lib/matomo.ts`, preconnect y variables de configuración).
- Carga de Outfit e IBM Plex Mono desde Google Fonts.
- 273 dibujos subidos por alumnado que estaban en `backend/static/submissions/graphics/` (ahora en `.gitignore`).
- `vite.svg`, `react.svg` y `VITE_N8N_WEBHOOK_URL` (restos sin uso).

### Añadido
- Tipografías Outfit e IBM Plex Mono servidas en local con `frontend/public/fonts/OFL.txt`.
- `CREDITS.md` (tipografías, ARASAAC, sonidos, librerías) y apartado «Créditos, licencia y material ajeno» en la FAQ.
- Crédito ARASAAC visible en la ficha pública y en el buscador de pictogramas.
- `PRIVACY.md` en español: qué guarda el navegador, qué guarda el servidor, cuánto tiempo y con qué se comunica.
- `DECISIONES.md` (registro de decisiones a posteriori) y este `CHANGELOG.md`.
- README: «Qué guarda y con qué se comunica», «Cómo modificarlo» y «Hecho con IA»; README real del frontend.

### Corregido
- Accesibilidad: nombre accesible del filtro de categorías de la wiki, `<label>` en el tipo de marcador y en
  «Permite empate» de `/proponer-deporte`, texto del enlace de volver, botones de icono del buscador de pictogramas.
- Contraste: gris auxiliar `#5d6f8f` → `#46556f`; botón SSO con texto oscuro; pie `@edumind/footer` ajustado desde CSS local.
- Regiones: `<main>` en `/express`, `/partido`, `/proponer-deporte` y `/ejemplo-didactico`; `h1` en las pantallas de `/partido`.
- `/express` desbordaba 19 px a 375 px cuando la tipografía aún no había cargado (botón con `nowrap`).
- `/express` decía «26 deportes»; el catálogo tiene más de 40.
- `COPYRIGHT` y `AUTHORS` coherentes con la licencia doble AGPL-3.0-or-later / EUPL-1.2.
- Docstring de las anotaciones por PIN: no existe purga automática a los 30 días.

## [3.0.0] — 2026-08-31

Versión publicada en liga.edumind.es antes de la evaluación VCER (sin etiqueta en git).
