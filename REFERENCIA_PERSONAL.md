# Referencia Personal - Liga EDUmind (privado)

Este documento es la unica referencia de trabajo para este servidor.
No esta pensado para GitHub ni para terceros.

Fecha base: 2026-02-12

---

## 1) Resumen ejecutivo

- Sistema operativo en produccion con FastAPI + React + Postgres + Redis.
- La app combina marcador deportivo y evaluacion educativa (MRPS y roles).
- Existe modo Express y modo Liga (servidor).
- Offline/PWA esta implementado en modo Liga con sincronizacion y cola.
- Se agregaron guardas de seguridad para bases de datos y scripts.

---

## 2) Arquitectura

Backend:
- FastAPI async, SQLAlchemy async, Pydantic v2
- Postgres 15, Redis 7
- JWT con refresh tokens

Frontend:
- React + Vite + TypeScript
- React Query + Zustand
- PWA con Workbox
- IndexedDB para offline

Infra:
- Docker + Docker Compose
- Nginx reverse proxy

Puertos habituales:
- Backend local: 8001
- Frontend dev: 5173
- Postgres docker: 5433 (host)
- Redis docker: 6379

---

## 3) Entidades clave

Liga:
- Configura temporada, tipo de deporte y reglas.

Jornada:
- Agrupa partidos.

Partido:
- Marcador deportivo
- Evaluacion educativa
- Roles: local, visitante, arbitro, grada local, grada visitante

TipoDeporte:
- Define tipo_marcador y config especifica (tiempos, posesion, etc).

---

## 4) Marcador y puntos

Sistema deportivo:
- Resultado deportivo se calcula desde el marcador real.
- Puntos de sistema EDUmind: 3 victoria, 2 empate, 1 derrota.
- El marcador real depende de tipo_marcador (goles, puntos, sets, tries, carreras).

Sistema educativo:
- Juego limpio (MRPS)
- Arbitro (media de conocimiento, gestion, apoyo)
- Grada (animacion, respeto, participacion)

Roles educativos:
- Los equipos en rol arbitro o grada suman puntos educativos aunque no jueguen.

Config por deporte:
- Se usan claves en TipoDeporte.config para tiempo y reglas.
- Para deportes tipo tries: valor_try y valor_conversion.
- Para posesion o cambios: tiempo_posesion_segundos, cambio_campo_segundos, etc.

Nota:
- Hay logica duplicada parcial en frontend para mostrar marcador.
- El objetivo es tener una sola fuente de verdad en backend.

---

## 5) Modo Express vs Modo Liga

Express:
- Partidos rapidos sin crear liga completa.
- Marcador y acta en frontend.

Liga (servidor):
- Partidos persistentes con roles y evaluacion educativa.
- Clasificacion educativa y deportiva.

---

## 6) Offline y PWA

Estado actual:
- Service Worker activo (Workbox)
- IndexedDB con stores de partidos, evaluaciones, ligas, etc.
- Cola de operaciones offline
- Deteccion de red y UI de conflictos

Limitaciones:
- Para usar un partido offline por primera vez, debe haberse cacheado antes.
- Conflictos se resuelven manualmente si hay cambios simultaneos.

Flujo recomendado:
- Abrir lista de partidos con conexion antes de entrar a pabellon.
- Si hay conflicto: resolver y reintentar sync.

Referencia:
- CHECKPOINT_PWA_OFFLINE_2026-02-05.md
- PLAN_ESTRATEGICO_OFFLINE.md

---

## 7) Propuestas de deporte

Flujo:
- Formulario de propuesta en frontend.
- Backend guarda en sport_proposals.
- Notificacion opcional via Discord webhook (config por env).
- Admin valida y transforma config sugerida en TipoDeporte.

Referencia:
- n8n_instructions.md

---

## 8) Seguridad y proteccion de BD

Guardas de seguridad:
- Scripts bloquean produccion si el host esta en PROD_DB_HOSTS y ALLOW_PROD_DB=0.

Variables clave:
- PROD_DB_HOSTS=db
- ALLOW_PROD_DB=0 por defecto

Backups y restore:
- Ver DB_SAFETY_RUNBOOK.md
- Scripts en /var/www/liga_edumind/scripts

Auditoria de seguridad:
- SECURITY_AUDIT_2026-02-12.md

---

## 9) Testing

Objetivo:
- Validar marcador + evaluacion + acta sin regresiones.

Estado actual:
- Tests preparados en backend/app/tests
- En este entorno sandbox no se pueden ejecutar por restricciones de sockets/SQLite async.

Ejecucion recomendada (entorno con red):
- Ver TESTING_GUIDE.md

---

## 10) Operaciones y despliegue

Backend:
- venv en backend/venv
- Start: uvicorn app.main:app --port 8001

Frontend:
- npm run build en frontend/
- artefactos en frontend/dist

Infra:
- docker-compose.yml y docker-compose.prod.yml
- Nginx sirve frontend y proxya API

Cloudflare:
- CLOUDFLARE_PURGE_INSTRUCTIONS.md

---

## 11) Cambios de hoy (resumen tecnico)

Seguridad:
- Eliminado webhook hardcodeado en sport_proposals.
- Guardas DB: PROD_DB_HOSTS=db y ALLOW_PROD_DB=0.
- Rate limiting en /auth/login y /auth/register (10/minuto).
- CORS por defecto sin http para liga.edumind.es.

Marcador y evaluacion:
- Backend: tries usa config (valor_try / valor_conversion).
- Backend: evaluacion personalizada suma puntos de arbitro y gradas por rol.
- Frontend: scoreboard express y acta usan config de deporte en tries.
- Frontend: inicializacion de tiempo usa config en Express.

QA:
- conftest permite PYTEST_DATABASE_URL y fija SECRET_KEY de test.
- guard para desactivar recalculo de stats en tests.
- reportlab verificado como instalado.

Docs:
- DB_SAFETY_RUNBOOK.md actualizado.
- TESTING_GUIDE.md actualizado.
- SECURITY_AUDIT_2026-02-12.md creado.

---

## 12) Documentos integrados (fuentes)

Documentos previos que quedan consolidados en este archivo:
- README.md
- README_COMPLETO.md
- SYSTEM_AUDIT_REPORT.md
- AUDITORIA_FINAL_2026-02-04.md
- AUDITORIA_FUNCIONAL_2025-12-07.md
- AUDITORIA_FUNCIONAL_FINAL.md
- DOCUMENTACION_PROGRESO_2025-12-08.md
- SCALABILITY_AUDIT_PLAN.md
- CHECKPOINT_PWA_OFFLINE_2026-02-05.md
- PLAN_ESTRATEGICO_OFFLINE.md
- TESTING_GUIDE.md
- DB_SAFETY_RUNBOOK.md
- CLOUDFLARE_PURGE_INSTRUCTIONS.md
- n8n_instructions.md

---

## 13) Pendientes principales

Alta prioridad:
- Confirmar que evaluacion educativa se persiste siempre antes de finalizar.
- Normalizar logica de marcador para eliminar duplicidad en frontend.

Media prioridad:
- Mejorar UX de precarga offline completa por liga.
- E2E basico del flujo completo en entorno con DB real de test.

---

## 14) Notas personales

- Documento privado. No publicar en GitHub.
- Si se sube codigo a GitHub, excluir .env, backups, y docs internos.
