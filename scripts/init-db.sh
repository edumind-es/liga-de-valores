#!/bin/bash

#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.
#
# Script to initialize database and create first migration

set -euo pipefail

echo "🔧 Inicializando base de datos..."

cd /var/www/liga_edumind/backend

# Activate venv if exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Archivo .env no encontrado. Copia .env.example a .env primero."
    exit 1
fi

# Initialize Alembic if needed
if [ ! -d "alembic/versions" ] || [ -z "$(ls -A alembic/versions 2>/dev/null)" ]; then
    echo "📝 Creando primera migración..."
    alembic revision --autogenerate -m "Initial migration: create users table"
fi

# Run migrations
echo "⬆️  Aplicando migraciones..."
alembic upgrade head

echo "✅ Base de datos inicializada correctamente!"
echo ""
echo "Próximos pasos:"
echo "  - Iniciar backend: cd backend && uvicorn app.main:app --reload"
echo "  - O usar Docker: docker compose up -d"
