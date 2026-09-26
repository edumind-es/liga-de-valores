# Créditos y material ajeno

Inventario del material de terceros que usa Liga de Valores, con su autoría y licencia.
Lo que no figura aquí (código, logotipos de Liga de Valores y de EDUmind, textos, catálogo de
deportes, sistema visual Lámina y el paquete `@edumind/footer`) es obra de Luis Vilela Acuña · EDUmind®
y se distribuye con la licencia doble AGPL-3.0-or-later / EUPL-1.2 (ver [LICENSE](LICENSE)); los
logotipos y la marca no se ceden con el código (ver [TRADEMARKS.md](TRADEMARKS.md)).

## Pictogramas

- **ARASAAC**, usados en las fichas de juego (búsqueda en el generador y visualización en la wiki y en el PDF).
  Fórmula de atribución exigida por ARASAAC, que la app muestra allí donde aparecen pictogramas:
  «Autor pictogramas: Sergio Palao. Origen: ARASAAC (http://www.arasaac.org). Licencia: CC BY-NC-SA. Propiedad: Gobierno de Aragón (España)».
  La licencia es no comercial: si reutilizas esta app con fines comerciales, retira o sustituye los pictogramas.
  Los pictogramas no se incluyen en el repositorio: se cargan desde `api.arasaac.org` y `static.arasaac.org` solo cuando se abre una ficha que los lleva o se busca uno.

## Tipografías (todas en `frontend/public/fonts/`, licencia SIL Open Font License 1.1, texto en `frontend/public/fonts/OFL.txt`)

| Familia | Titular | Origen |
|---|---|---|
| Outfit (variable 400-800) | Copyright 2021 The Outfit Project Authors | https://github.com/Outfitio/Outfit-Fonts |
| IBM Plex Mono (400, 500, 600) | Copyright © 2017 IBM Corp., nombre reservado «Plex» | https://github.com/IBM/plex |
| Atkinson Hyperlegible (400, 700) | Copyright 2020 Braille Institute of America, Inc. | https://github.com/googlefonts/atkinson-hyperlegible |
| Literata (400) | Copyright 2017 The Literata Project Authors | https://github.com/googlefonts/literata |

Desde la versión 3.0.1 no se carga nada de Google Fonts: los ficheros woff2 (subconjunto latino) se sirven desde la propia app.

## Sonidos

- `frontend/public/sounds/silbato.mp3` y `frontend/public/sounds/gol.mp3` (marcador en vivo, `components/WhistleButton.tsx` y `lib/audio.ts`).
  **Origen y licencia pendientes de confirmar por el autor.** Los ficheros no llevan metadatos y no consta su procedencia
  en la documentación; hasta que se confirme, quien reutilice la app debería sustituirlos por sonidos propios o CC0.

## Librerías principales

Frontend (npm; la licencia completa de cada una está en su `package.json` dentro de `node_modules`):

- React y React DOM — MIT
- Vite y vite-plugin-pwa — MIT
- Tailwind CSS — MIT
- Radix UI (`@radix-ui/*`, base de los componentes shadcn/ui) — MIT (WorkOS)
- Lucide (`lucide-react`, iconos) — ISC
- TanStack Query — MIT
- React Router — MIT
- react-hook-form y zod — MIT
- i18next y react-i18next — MIT
- sonner (avisos) — MIT
- idb (IndexedDB, copia offline) — ISC
- jsPDF y html2canvas (exportación) — MIT
- Recharts — MIT
- axios — MIT
- `@edumind/footer` — AGPL-3.0, propio (Luis Vilela Acuña)

Backend (pip):

- FastAPI y Gunicorn — MIT; Starlette y Uvicorn — BSD-3-Clause
- SQLAlchemy y Alembic — MIT
- Pydantic — MIT
- ReportLab (PDF) — BSD
- Pillow — MIT-CMU
- openpyxl — MIT
- aiosmtplib, arq, redis — MIT
- python-jose — MIT; passlib — BSD; argon2-cffi — MIT

## Servicios externos con los que se comunica

Ver [PRIVACY.md](PRIVACY.md): ARASAAC (pictogramas), Authentik (SSO, solo al pulsar), y desde el servidor Discord (webhook de propuestas), SMTP (correo de fichas) y Nextcloud (opcional).
