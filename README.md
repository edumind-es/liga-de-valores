# Liga de Valores

Gestión de ligas deportivas escolares donde **no solo puntúa el marcador**. Cada partido reparte puntos por juego limpio, por el arbitraje del alumnado y por el comportamiento de la grada, y la clasificación se lee por Los Cinco Mundos. Backend en FastAPI, frontend en React (PWA con modo offline), con vistas públicas para proyectar en el aula o el pabellón.

> El objetivo pedagógico es que ganar el partido no baste para ganar la liga.

Sitio: https://liga.edumind.es · Versión 3.0.1 · [CHANGELOG](CHANGELOG.md) · [Decisiones](DECISIONES.md) · [Privacidad](PRIVACY.md) · [Créditos](CREDITS.md)

## Qué hace

- El docente crea ligas, equipos, jornadas y partidos; define criterios de valores propios o desde plantillas y los asocia a un mundo.
- El alumnado entra por **PIN de 6 dígitos sin cuenta** para proponer marcadores, evaluar arbitraje y grada y dejar anotaciones anónimas que el docente modera.
- Marcador **Express** sin cuenta (temporal, vive en la pestaña) con acta en PDF.
- Generador de **fichas de juego** con pictogramas ARASAAC que llegan al docente por correo y pueden publicarse anónimas en la wiki pública.
- Catálogo de más de 40 deportes (convencionales y alternativos) ampliable por propuesta.
- Funciona sin WiFi en el gimnasio: copia local en IndexedDB y sincronización al volver.

## Qué guarda y con qué se comunica

En corto: el alumnado no tiene cuenta ni tabla; sin analítica; al abrir la app no se conecta con ningún tercero. El servidor guarda ligas, equipos, partidos, evaluaciones y fichas (sin nombre de alumno); el navegador guarda una copia offline y las preferencias de accesibilidad. Servicios opcionales del servidor: correo SMTP (fichas al docente), webhook de Discord (propuestas de deporte) y Nextcloud (copia de PDFs). Detalle completo, plazos y variables en [PRIVACY.md](PRIVACY.md).

## Arrancar en local

Frontend:

```bash
cd frontend
npm ci
npm run dev        # o npm run build
```

Backend:

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Copia `.env.example` a `.env` en `backend/` y `frontend/` y rellénalos. Los valores del ejemplo son marcadores: genera secretos nuevos para cualquier despliegue real. También hay `docker-compose.yml` (backend, worker de correo, PostgreSQL, Redis y frontend).

## Pruebas

```bash
cd backend && pytest            # 125 pruebas (pytest-asyncio, SQLite en memoria)
cd frontend && npm run test:run # 7 pruebas Vitest + Testing Library
cd frontend && npm run lint
```

La integración continua (`.github/workflows/ci-cd.yml`) compila el frontend, comprueba el backend, valida que las migraciones de Alembic sean seguras y con una sola cabeza, y pasa `pip-audit`, `bandit` y Trivy sobre la imagen.

## Cómo modificarlo

**Mapa de carpetas**

- `backend/app/api/v1/` — un fichero por recurso de la API (`ligas.py`, `partidos.py`, `public.py` para el acceso por PIN, `tools.py` para las fichas, `tipos_deporte.py`, `criterios.py`…).
- `backend/app/models/` y `schemas/` — tablas SQLAlchemy y esquemas Pydantic.
- `backend/app/services/` — lógica: clasificación (`clasificacion_service.py`), PDF (`pdf_generator.py`), correo, Discord, Nextcloud, limpieza de fichas, PIN, códigos anónimos.
- `backend/app/core/mundos.py` — Los Cinco Mundos y el mapeo pedagógico por defecto.
- `backend/alembic/versions/` — migraciones; el catálogo de deportes vive aquí.
- `frontend/src/` — pantallas en `pages/`, componentes en `components/`, offline en `lib/offline/`, idiomas en `i18n/locales/`. Ver [frontend/README.md](frontend/README.md).

**Añadir un deporte**

1. Copia una migración como `backend/alembic/versions/011_add_new_sports.py` con una revisión nueva (`revises` = la cabeza actual, `alembic heads`).
2. Inserta en `tipos_deporte`: `nombre`, `codigo` (único, sin espacios), `tipo_marcador` (`goles`, `sets`, `puntos`, `tries` o `carreras`), `permite_empate`, `config` (JSON con las reglas del marcador: `puntos_para_ganar`, `sets_para_ganar`, `botones_puntuacion`, `tiempo_posesion_segundos`…), `icono`, `descripcion` y `categoria` (`alternativo`, `popular`, `tradicional`, `convencional`). Usa `ON CONFLICT (codigo) DO UPDATE` para que sea idempotente.
3. `alembic upgrade head`. El frontend lee el catálogo de la API: no hay que tocarlo. Si el deporte necesita un marcador distinto a los cinco tipos existentes, el componente está en `frontend/src/pages/Partidos/`.
4. Si prefieres no programar, propón el deporte desde `/proponer-deporte`.

**Cambiar los criterios de valores o los mundos**

- Los criterios se crean por liga desde la app (`Ligas → Gestión de criterios`) o desde plantillas (`GET /api/v1/criterios/plantillas`, definidas en `backend/app/api/v1/criterios.py`); cada criterio lleva nombre, descripción, escala y mundo.
- Qué dimensión clásica va a qué mundo (deportivo → físico, árbitro → mental, grada → social, juego limpio → interior) se ajusta en `backend/app/core/mundos.py`, pensado para cambiarse sin tocar nada más.

**Añadir un idioma**: copia `frontend/src/i18n/locales/es.json` con el código nuevo y regístralo en `frontend/src/i18n/index.ts`.

**Desactivar servicios opcionales**: deja vacías `DISCORD_WEBHOOK_URL` o `NEXTCLOUD_*`; el SSO se apaga con `VITE_AUTHENTIK_ENABLED=false`; el correo necesita `MAIL_*` (sin él, las fichas no llegan al docente).

**Estilo**: colores solo a través de tokens CSS de `frontend/src/index.css`; tipografías en local; nada de CDN al abrir la app.

## Hecho con IA

Este recurso se ha desarrollado con vibe coding con asistencia de IA (Claude Code y ChatGPT), según la [política de IA de EDUmind](https://edumind.es/es/legal/ia). Lo que ha comprobado el autor:

- Las 125 pruebas automáticas del backend y las 7 del frontend pasan en cada cambio (integración continua en GitHub Actions, con auditoría de dependencias y de la imagen Docker).
- Las licencias del material ajeno, revisadas una a una en [CREDITS.md](CREDITS.md); los sonidos del marcador quedan pendientes de confirmar.
- Los textos que ve el alumnado (acceso por PIN, marcador Express, generador de fichas) y las reglas del catálogo de deportes.
- La ejecución en navegador de escritorio y móvil (375 px), con menú de accesibilidad y comprobación automática con axe.
- La unidad didáctica de ejemplo (`/ejemplo-didactico`) se organizó con IA y fue supervisada por el autor; avisa de que conviene contrastar las referencias curriculares con el decreto vigente.

## Colaborar

Se puede colaborar **sin programar**: contar cómo te ha ido en clase, reportar un fallo, revisar los textos o traducir. Todo el proyecto está en español. Empieza por [CONTRIBUTING.md](CONTRIBUTING.md) y el [código de conducta](CODE_OF_CONDUCT.md).

¿Un fallo de seguridad? No abras un issue público: ver [SECURITY.md](SECURITY.md).

Este repositorio es una *release saneada* para revisión y auditoría: no incluye secretos, configuración de despliegue ni datos de aula. Ver [OPEN_SOURCE_RELEASE.md](OPEN_SOURCE_RELEASE.md).

## Licencia y créditos

Licencia doble **AGPL-3.0-or-later** *o* **EUPL-1.2**, a elección de quien la reutilice. Ver [LICENSE](LICENSE), [COPYRIGHT](COPYRIGHT), [AUTHORS](AUTHORS) y [NOTICE](NOTICE). El material de terceros (tipografías OFL, pictogramas ARASAAC CC BY-NC-SA, librerías) está inventariado en [CREDITS.md](CREDITS.md).

EDUmind® es marca registrada en España (OEPM). El código es libre; la marca y los logotipos no se ceden con él — ver [TRADEMARKS.md](TRADEMARKS.md).

Por **Luis Vilela Acuña** — maestro de Educación Física · EDUmind®.
