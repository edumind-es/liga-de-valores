# Liga EDUmind en tu centro: instalación del modo aula

Esta guía explica cómo tener Liga EDUmind funcionando en un equipo del
centro (el portátil del docente, un miniPC del gimnasio, el servidor del
cole…) **sin depender de ningún servidor externo**. Los datos del alumnado
no salen de ese equipo.

## Qué necesitas

- Un equipo con **Docker**:
  - Windows o macOS: [Docker Desktop](https://docs.docker.com/desktop/)
  - Linux: Docker Engine + el plugin Compose (`docker-compose-plugin`)
- Unos 3 GB de espacio libre.
- Conexión a internet **solo para la instalación inicial** (descarga de
  imágenes y dependencias). Después, la app funciona sin internet.

## Instalación

### Linux / macOS

```bash
git clone https://github.com/edumind-es/liga-edumind.git
cd liga-edumind
./scripts/instalar_aula.sh
```

El instalador:
1. Genera credenciales locales aleatorias en un archivo `.env`.
2. Construye y arranca los cinco servicios (PostgreSQL, Redis, backend,
   worker de correo y web).
3. Aplica las migraciones de base de datos.
4. Te ofrece crear el usuario administrador.

### Windows (PowerShell, con Docker Desktop)

```powershell
git clone https://github.com/edumind-es/liga-edumind.git
cd liga-edumind
Copy-Item .env.example .env
# Edita .env y rellena POSTGRES_PASSWORD y SECRET_KEY con valores largos y aleatorios
docker compose -f docker-compose.aula.yml up -d --build
# Crear el administrador:
docker compose -f docker-compose.aula.yml exec backend python scripts/crear_admin.py ADMIN01
```

## Uso

- En el propio equipo: **http://localhost:8080**
- Desde otros dispositivos de la red del centro (tablets para el marcador,
  la pantalla del gimnasio…): **http://IP-del-equipo:8080**
  - La IP se ve con `hostname -I` (Linux) o `ipconfig` (Windows).
  - El equipo debe permitir conexiones entrantes al puerto 8080 en su
    cortafuegos.
- Si el puerto 8080 está ocupado, cambia `AULA_PORT` en el `.env` y
  reinicia.

Notas del modo aula respecto a una instalación con dominio propio:

- La app se sirve por **HTTP dentro de la red local**, así que las cookies
  de sesión van sin el atributo `Secure` (`AUTH_COOKIE_SECURE=false`). Es
  lo adecuado para una red de centro; si publicas la instancia en internet,
  usa un dominio con HTTPS y la configuración de producción.
- El limitador de peticiones viene desactivado: en el aula todas las
  tablets comparten la IP del proxy y se bloquearían entre sí.
- El límite SaaS de ligas por docente no aplica (ajustable con
  `AULA_MAX_LIGAS` en el `.env`).
- El acceso con SSO (Authentik) es opcional y viene desactivado: en el
  aula se entra con código y contraseña locales.

## Qué funciona sin internet

Todo el trabajo de aula: ligas, equipos, calendarios, partidos, marcador
en vivo, evaluaciones, clasificaciones, actas, wiki de juegos, exportes.
La PWA puede instalarse en las tablets desde el navegador y conserva su
copia offline de la liga preparada.

Funciones opcionales que necesitan red:
- **Envío de fichas por email** — requiere además configurar un servidor
  de correo (variables `MAIL_*` en el `.env`). Sin configurar, la app
  simplemente no envía correos.
- **Pictogramas ARASAAC en los PDF** — sin internet, el PDF se genera
  igualmente sin pictogramas.
- **Copia de evidencias a Nextcloud** y **avisos por Discord** — opcionales
  y desactivados por defecto.

## Operaciones habituales

```bash
# Parar la aplicación (los datos se conservan)
docker compose -f docker-compose.aula.yml down

# Arrancarla de nuevo
docker compose -f docker-compose.aula.yml up -d

# Ver los registros del backend
docker compose -f docker-compose.aula.yml logs -f backend
```

### Copia de seguridad

Los datos viven en volúmenes Docker locales (`postgres_data_aula`,
`redis_data_aula` y `backend_uploads_aula`). Copia de seguridad de la base
de datos:

```bash
docker compose -f docker-compose.aula.yml exec db pg_dump -U liga_edumind liga_edumind > copia_liga_$(date +%F).sql
```

Restaurar una copia:

```bash
docker compose -f docker-compose.aula.yml exec -T db psql -U liga_edumind liga_edumind < copia_liga_2026-11-05.sql
```

### Actualizar a una versión nueva

```bash
git pull
docker compose -f docker-compose.aula.yml up -d --build
```

Las migraciones de base de datos se aplican solas al arrancar el backend.

## Privacidad

- Ningún dato sale del equipo: no hay telemetría ni servicios de terceros
  (detalle completo en [PRIVACY.md](../PRIVACY.md)).
- El registro de docentes guarda el consentimiento RGPD (fecha e IP).
- Las fichas de juegos del alumnado se almacenan de forma anónima; la
  atribución del docente es opcional.
- Recuerda: la responsabilidad del tratamiento de datos es del centro.
  Esta arquitectura local minimiza riesgos, pero conviene incluir la
  herramienta en el registro de actividades de tratamiento del centro.

## Problemas frecuentes

- **"Define POSTGRES_PASSWORD en el archivo .env"** — falta crear el
  `.env` (usa el instalador o copia `.env.example`).
- **El backend no llega a "healthy"** — mira los registros:
  `docker compose -f docker-compose.aula.yml logs backend`.
- **No se ve desde las tablets** — comprueba que ambas están en la misma
  red y que el cortafuegos del equipo permite el puerto 8080.
- **El login no entra desde una tablet** — asegúrate de abrir la app por
  `http://IP-del-equipo:8080` (no mezclar localhost e IP en el mismo
  navegador, cada origen guarda su propia sesión).
