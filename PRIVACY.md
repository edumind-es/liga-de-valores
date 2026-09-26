# Privacidad — Liga de Valores

Este documento describe, en español y con referencias al código, qué datos maneja la app,
dónde se guardan, cuánto tiempo y con qué servicios se comunica. Vale para la instancia
pública liga.edumind.es y para cualquier despliegue propio (quien despliega es responsable
del tratamiento y debe ajustar su información al alumnado y familias).

Principios: el alumnado no tiene cuenta ni tabla propia; se identifica por PIN y por códigos
anónimos; sin analítica; sin conexiones a terceros al abrir la app.

## 1. Qué guarda el navegador (dispositivo del usuario)

| Dónde | Qué | Cuánto tiempo |
|---|---|---|
| Cookies HttpOnly | tokens de sesión del docente (`backend/app/api/v1/auth.py`) | acceso corto; refresco 7 días (`REFRESH_TOKEN_EXPIRE_DAYS`) |
| `localStorage` `liga-edumind-accessibility` | preferencias de accesibilidad (tamaño de letra, contraste, e-ink, movimiento reducido) | hasta que se borren |
| `sessionStorage` | partidos del marcador Express (`express_match_*`) y marcas de recuperación tras un error de carga | se borra al cerrar la pestaña |
| IndexedDB `liga-edumind-offline` | copia de ligas, equipos, partidos, evaluaciones y tipos de deporte ya consultados, para el gimnasio sin WiFi (`frontend/src/lib/offline/offlineDB.ts`) | hasta que el usuario borre los datos del sitio |
| Caché del service worker | la propia app, imágenes (30 días), tipografías (1 año) y sonidos. **La API nunca se cachea** (`NetworkOnly` en `frontend/vite.config.ts`) | según esos plazos |

No se guarda ningún dato personal del alumnado en el navegador salvo lo que el propio
docente haya escrito como nombre de equipo (la app avisa de no usar nombres reales).

## 2. Qué guarda el servidor (PostgreSQL del despliegue)

**Docentes** (`models/user.py`): código de usuario, email (opcional), contraseña con hash
(argon2/bcrypt), fecha e IP de aceptación de la política de privacidad, verificación de email
y, si el docente las configura, credenciales de Nextcloud cifradas (Fernet). Registro de
auditoría de sus acciones con IP (`models/audit_log.py`), sin plazo de borrado automático.

**Ligas, equipos, jornadas, partidos, evaluaciones, criterios y fases finales**: nombres de
equipo, logotipos, colores, marcadores y puntuaciones de juego limpio, arbitraje y grada.
**No hay tabla de alumnos**; cuando hace falta distinguir a alguien se usan códigos anónimos
tipo `LEON-01` (`services/student_code_generator.py`).

**Anotaciones de partido por PIN** (`api/v1/public.py`): texto libre, tipo pedagógico y fecha.
Sin nombre, sin IP, sin identificador del alumno. Quedan pendientes hasta que el docente las
aprueba, rechaza o elimina. No hay purga automática (el docente las borra desde el partido).

**Fichas de juego** (`models/game_submission.py`, `api/v1/tools.py`): título, materiales,
reglas, dibujo (fichero en `static/submissions/graphics/`, fuera del repositorio), IDs de
pictogramas, liga de origen y evidencia de aceptación de las normas. **El nombre del alumno no
se guarda**: solo viaja en el asunto y en el PDF del correo al docente. Si la ficha no se publica,
aviso al docente a los 30 días y borrado (registro, dibujo y PDF) a los 45
(`services/cleanup_service.py`, ejecutado desde una tarea programada del servidor). Al
publicarla, aparece en la wiki sin nombre de alumno y con el del docente solo si lo consiente.

**Propuestas de deporte** (`models/sport_proposal.py`): nombre, descripción, configuración
sugerida y email de contacto del docente.

**Exportaciones** (CSV/PDF de clasificaciones, actas, fichas): llevan nombres de equipo, no de
alumnos; el PDF de la ficha que recibe el docente sí lleva el nombre que el alumno escribió.

## 3. Con qué se comunica

Desde el navegador:

| Dominio | Para qué | Cuándo |
|---|---|---|
| la propia API (`/api/v1`) | todo el funcionamiento | siempre |
| `api.arasaac.org`, `static.arasaac.org` | buscar y mostrar pictogramas (viaja la palabra buscada y los IDs) | solo al abrir una ficha con pictogramas o al buscar |
| `auth.edumind.es` (Authentik) | inicio de sesión único del docente | solo al pulsar «Acceder con EDUmind SSO» |

Nada más: desde la versión 3.0.1 **no hay analítica** (se retiró Matomo) y las tipografías se
sirven desde la propia app (antes, Google Fonts).

Desde el servidor (todo opcional por configuración, `backend/app/config.py`):

| Servicio | Qué envía | Variable |
|---|---|---|
| Discord (webhook) | aviso de nueva propuesta de deporte; el email del docente va enmascarado salvo que se active `DISCORD_INCLUDE_CONTACT_EMAIL` | `DISCORD_WEBHOOK_URL` |
| SMTP | fichas de juego al docente (asunto y PDF con el nombre del alumno), verificación de email, recuperación de contraseña y avisos de limpieza | `MAIL_SERVER` y `MAIL_*` |
| Nextcloud (WebDAV) | copia del PDF de la ficha en la carpeta `Evidencias_Liga`, organizada por liga y alumno, si el docente configuró sus credenciales | `NEXTCLOUD_*` o credenciales por docente |
| Redis local | cola de correos y caché | `EMAIL_QUEUE_REDIS_URL` |

**Sobre el correo:** el valor por defecto de `MAIL_SERVER` es `mail.smtp2go.com`, un relé
externo. Como el correo de la ficha contiene el nombre de un alumno, cada despliegue debe
apuntar a un servidor de correo propio o del centro, o formalizar el contrato de encargado de
tratamiento con el proveedor que use. Es configuración, no código: basta cambiar `MAIL_*`.

## 4. Derechos y contacto

Responsable de la instancia pública: Luis Vilela Acuña · EDUmind®, contacto@edumind.es.
Política general de privacidad y de IA del ecosistema: https://edumind.es/es/legal/privacidad
y https://edumind.es/es/legal/ia. Para pedir acceso, rectificación o borrado, escribe a ese
correo indicando la liga y el dato.

## 5. Para quien despliega su propia instancia

Esta release pública no incluye bases de datos, copias de seguridad, ficheros subidos por el
alumnado, registros ni configuración privada. Genera secretos nuevos, revisa `MAIL_*`, `DISCORD_*`
y `NEXTCLOUD_*`, usa datos sintéticos en desarrollo y adapta esta política a tu centro.
