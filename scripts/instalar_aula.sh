#!/usr/bin/env bash
#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
# Author: Luis Vilela Acuña
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#

# Instalador del MODO AULA de Liga EDUmind.
# Levanta la app completa en este equipo con Docker: base de datos, Redis,
# backend, worker de correo y frontend. Los datos no salen del equipo
# (local-first).
#
# Requisitos: Docker con el plugin Compose (Docker Desktop en
# Windows/macOS, o docker + docker-compose-plugin en Linux).
#
# Uso:  ./scripts/instalar_aula.sh

set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
    echo "[ERROR] Docker no está instalado. Instálalo desde https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
    echo "[ERROR] El plugin 'docker compose' no está disponible."
    exit 1
fi

# 1. Generar el .env con credenciales aleatorias si no existe
if [ ! -f .env ]; then
    echo "[1/4] Generando credenciales locales en .env ..."
    SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
    POSTGRES_PASSWORD=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')
    {
        echo "# Generado por instalar_aula.sh el $(date +%F)"
        echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}"
        echo "SECRET_KEY=${SECRET_KEY}"
        echo "AULA_PORT=8080"
    } > .env
    echo "      Credenciales guardadas en .env (no compartas este archivo)."
else
    echo "[1/4] Ya existe un .env; se reutiliza."
fi

# 2. Construir y arrancar los servicios
echo "[2/4] Construyendo y arrancando Liga EDUmind (la primera vez tarda unos minutos)..."
docker compose -f docker-compose.aula.yml up -d --build

# 3. Esperar a que el backend esté sano (aplica las migraciones al arrancar)
echo "[3/4] Esperando a que la base de datos y el backend estén listos..."
estado="starting"
for _ in $(seq 1 40); do
    estado=$(docker inspect -f '{{.State.Health.Status}}' liga-edumind-backend-aula 2>/dev/null || echo "starting")
    if [ "$estado" = "healthy" ]; then
        break
    fi
    sleep 5
done

if [ "$estado" != "healthy" ]; then
    echo "[ERROR] El backend no ha llegado a estar sano. Revisa los registros con:"
    echo "        docker compose -f docker-compose.aula.yml logs backend"
    exit 1
fi

# 4. Crear el usuario administrador si se desea
echo "[4/4] Servicios en marcha."
echo ""
read -r -p "¿Crear ahora un usuario administrador? [S/n] " crear
if [ "${crear:-S}" != "n" ] && [ "${crear:-S}" != "N" ]; then
    read -r -p "Código de acceso del administrador (ej: ADMIN01): " codigo
    docker compose -f docker-compose.aula.yml exec backend python scripts/crear_admin.py "${codigo}"
fi

PUERTO=$(grep -E '^AULA_PORT=' .env | cut -d= -f2 || true)
PUERTO=${PUERTO:-8080}
IP_LOCAL=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "IP-de-este-equipo")

echo ""
echo "Liga EDUmind está en marcha."
echo "  En este equipo:        http://localhost:${PUERTO}"
echo "  Desde la red del aula: http://${IP_LOCAL}:${PUERTO}"
echo ""
echo "  Parar:    docker compose -f docker-compose.aula.yml down"
echo "  Arrancar: docker compose -f docker-compose.aula.yml up -d"
echo "  Los datos se conservan entre arranques en volúmenes Docker locales."
