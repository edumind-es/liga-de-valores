# Registro de decisiones — Liga de Valores

> Redactado a posteriori el 2026-09-26, a partir del código y de la evaluación VCER del 2026-09-25.
> Recoge cómo funciona hoy el recurso y por qué. Las decisiones nuevas se añaden al final con fecha.

## 1. Ganar el partido no basta para ganar la liga
Cada partido reparte puntos deportivos y, además, puntos por juego limpio, por el arbitraje del
alumnado y por el comportamiento de la grada. La clasificación se lee por Los Cinco Mundos
(físico, mental, emocional, social, interior; mapeo en `backend/app/core/mundos.py`). Es la razón
de ser de la app: convertir la competición escolar en una experiencia de valores, no solo de marcador.

## 2. El alumnado no tiene cuenta ni tabla propia
- No existe tabla de alumnos (`backend/app/models/equipo.py`, relación comentada a propósito).
- El alumnado entra por PIN de 6 dígitos (`services/public_pin_service.py`) y se identifica, si hace
  falta, con códigos anónimos tipo `LEON-01` (`services/student_code_generator.py`).
- Las anotaciones de partido se guardan sin nombre ni IP y pasan por el docente antes de verse.
- Por qué: minimizar datos de menores (RGPD/LOPDGDD) y que la app se pueda usar sin ningún alta.

## 3. Fichas de juego: el nombre del alumno no se guarda
El generador de fichas (`/public/:ligaId/fichas/generar`) pide el nombre del alumno solo para el PDF
que recibe el docente por correo; en la base de datos la ficha queda anónima (`models/game_submission.py`).
Si el docente la publica en la wiki, sale sin nombre de alumno y con el del docente solo si consiente.
Las fichas no publicadas reciben aviso a los 30 días y se borran a los 45 (`services/cleanup_service.py`).

## 4. Sin analítica (desde la 3.0.1)
Hasta la 3.0.0 se cargaba Matomo autoalojado (sin cookies, con DNT) en todas las rutas. La rúbrica
VCER lo considera seguimiento en pantallas usadas por alumnado, así que se ha retirado por completo.
Lo que se quiere medir se mide en el servidor (registros de nginx con IP anonimizada), no en el navegador.

## 5. Nada de terceros al abrir la app
Tipografías (Outfit, IBM Plex Mono, Atkinson Hyperlegible, Literata) servidas desde `frontend/public/fonts`
con su OFL. Las únicas conexiones externas son bajo demanda: ARASAAC al buscar o mostrar pictogramas,
Authentik al pulsar «Acceder con EDUmind SSO». Ver PRIVACY.md.

## 6. Local-first para el gimnasio sin WiFi
PWA con service worker y copia en IndexedDB (`lib/offline/`) de ligas, equipos, partidos y evaluaciones
ya vistos; el marcador Express vive en `sessionStorage` y desaparece al cerrar la pestaña. La API nunca se
cachea (NetworkOnly) para no servir datos viejos de otra persona en un dispositivo compartido.

## 7. Servicios del servidor, todos opcionales y documentados
- Discord (webhook) avisa de propuestas de deporte con el email del docente enmascarado.
- SMTP envía las fichas al docente. El valor por defecto (`mail.smtp2go.com`) es un relé externo:
  cada despliegue debe apuntar a su propio servidor de correo o al del centro (ver PRIVACY.md).
- Nextcloud (WebDAV) guarda una copia del PDF si el docente configura sus credenciales.
- Por qué se mantienen: el docente necesita recibir el trabajo del alumnado sin que la app guarde
  nombres; el correo es el canal que ya usa el centro.

## 8. Licencia doble AGPL-3.0-or-later / EUPL-1.2 y marca aparte
AGPL obliga a publicar el código de cualquier versión servida en red (art. 13), que es lo que Luis
quiere para una app pública; EUPL-1.2 facilita su reutilización por administraciones europeas.
La marca EDUmind® y los logotipos no se ceden (`TRADEMARKS.md`).

## 9. Catálogo de deportes en migraciones, no en código
Los deportes viven en la tabla `tipos_deporte` y se añaden con migraciones Alembic (`011_add_new_sports.py`
es el modelo a copiar). Así un centro puede ampliar el catálogo sin tocar el frontend, y la comunidad
propone deportes nuevos desde `/proponer-deporte`.

## 10. Release pública saneada
El repo público no contiene secretos, configuración de despliegue ni datos de aula
(`OPEN_SOURCE_RELEASE.md`). En la 3.0.1 se retiraron 273 dibujos de alumnado que habían entrado
por error en `backend/static/submissions/graphics/` (siguen en la historia; no se reescribe).

## 11. Todo en español
Código, comentarios, commits y documentación en español (`CONTRIBUTING.md`); la interfaz
también en gallego e inglés vía i18n. Facilita que el profesorado sin perfil técnico lea y adapte.

## Pendiente (anotado, no resuelto)
- Purga automática de anotaciones de partido: el docstring de `public.py` prometía borrado a los
  30 días y no existía ninguna tarea; se ha corregido el texto (hoy borra el docente a mano). Falta decidir
  si se implementa.
- Sonidos `silbato.mp3` y `gol.mp3`: origen por confirmar por el autor (ver CREDITS.md).
- Relé SMTP: sustituir el valor por defecto por un servidor propio en producción.
