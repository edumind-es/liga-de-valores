# Operaciones 2026-02-04 - Liga EDUmind (Docker-only)

## Contexto
- Decision operativa: mantener el backend en Docker (runtime unico) para evitar conflictos de puerto con systemd.
- Riesgo detectado: volumenes dev/prod compartidos en Docker Compose (posible borrado accidental de BD prod).

## Acciones ejecutadas
- Timestamp (UTC): 2026-02-04 14:48:12 UTC

1) Backend systemd detenido para eliminar conflicto con Docker.
   - Comando: `sudo systemctl stop liga_edumind_backend.service`
   - Verificacion:
     - `systemctl status liga_edumind_backend.service --no-pager` -> `Active: inactive (dead)`

2) Confirmacion de que Docker posee el puerto 8001.
   - `ss -ltnp | rg :8001` -> `LISTEN 127.0.0.1:8001`
   - `ps -ef | rg -n "docker-proxy.*8001"` -> `docker-proxy` en 127.0.0.1:8001
   - `docker ps` -> `liga-edumind-backend-prod` mapea `127.0.0.1:8001->8001`

3) Aislamiento de volumenes dev (evita conflicto con prod).
   - Archivo: `/var/www/liga_edumind/docker-compose.yml`
   - Cambios:
     - `postgres_data` -> `postgres_data_dev`
     - `redis_data` -> `redis_data_dev`
   - Verificacion:
     - `docker compose -f /var/www/liga_edumind/docker-compose.yml config`
     - Resultado relevante:
      - `liga_edumind_postgres_data_dev`
      - `liga_edumind_redis_data_dev`

4) Healthchecks en produccion (Docker-only).
   - Archivo: `/var/www/liga_edumind/docker-compose.prod.yml`
   - Cambios:
     - `redis` ahora incluye `healthcheck` (redis-cli ping).
     - `backend` ahora incluye `healthcheck` contra `/api/health`.

5) Alertas basicas (contenedor + salud HTTP) via service-monitor.
   - Archivo: `/var/www/scripts/monitoring/service-monitor.sh`
   - Se agrego:
     - Chequeo de contenedor `liga-edumind-backend-prod`.
     - Chequeo HTTP `http://127.0.0.1:8001/api/health`.
     - Log de alertas en `/var/log/service-monitor-alerts.log`.
     - Notificacion opcional via `DISCORD_WEBHOOK_URL` (si existe en `/var/www/liga_edumind/backend/.env`).
   - Servicio recargado:
     - `sudo systemctl restart service-monitor.service`

## Seguimiento
- Timestamp (UTC): 2026-02-04 14:56:11 UTC

1) Recreate de contenedores prod para aplicar healthchecks.
   - Comando: `docker compose -f /var/www/liga_edumind/docker-compose.prod.yml up -d --force-recreate`
   - Estado actual:
     - `liga-edumind-backend-prod` -> healthy
     - `liga-edumind-db-prod` -> healthy
     - `liga-edumind-redis-prod` -> healthy

2) Intento de `mask` del servicio systemd (fallo esperado).
   - Comandos:
     - `sudo cp /etc/systemd/system/liga_edumind_backend.service /etc/systemd/system/liga_edumind_backend.service.bak`
     - `sudo systemctl mask --now --force liga_edumind_backend.service`
   - Resultado:
     - Falla porque el archivo de servicio existe en `/etc/systemd/system/`.
     - Para enmascarar, es necesario mover/eliminar el archivo y luego aplicar `mask`.

3) `mask` aplicado correctamente (bloqueo definitivo).
   - Timestamp (UTC): 2026-02-04 14:58:42 UTC
   - Comandos:
     - `sudo mv /etc/systemd/system/liga_edumind_backend.service /etc/systemd/system/liga_edumind_backend.service.disabled`
     - `sudo systemctl mask --now liga_edumind_backend.service`
     - `sudo systemctl daemon-reload`
   - Resultado:
     - `Created symlink /etc/systemd/system/liga_edumind_backend.service → /dev/null.`

## Acciones pendientes / recomendadas
- No hay pendientes criticos en este punto.
- Si en el futuro se quiere reactivar el servicio systemd:
  - `sudo systemctl unmask liga_edumind_backend.service`
  - `sudo mv /etc/systemd/system/liga_edumind_backend.service.disabled /etc/systemd/system/liga_edumind_backend.service`
  - `sudo systemctl daemon-reload`

## Riesgos mitigados
- Conflicto de puerto 8001 (systemd vs Docker).
- Destruccion accidental de volumen de BD prod al usar `docker-compose down -v` en dev.
