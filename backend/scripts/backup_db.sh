#!/bin/bash
#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# Liga EDUmind - Database Backup Script (PostgreSQL)
# Cron: 0 4 * * * /var/www/liga_edumind/backend/scripts/backup_db.sh
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/.env"

if [ -f "${ENV_FILE}" ]; then
    set -a
    # shellcheck source=/dev/null
    . "${ENV_FILE}"
    set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo "❌ DATABASE_URL no configurada. Define backend/.env antes de ejecutar el backup."
    exit 1
fi

DB_URL="${DATABASE_URL/postgresql+asyncpg:\/\//postgresql://}"
BACKUP_DIR="${PROJECT_DIR}/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/liga_edumind_${TIMESTAMP}.dump"

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

echo "🚀 Creating PostgreSQL backup from DATABASE_URL..."

# Create backup
pg_dump --dbname="${DB_URL}" -F c -b -v -f "${BACKUP_FILE}"

# Verify backup was created
if [ -f "${BACKUP_FILE}" ]; then
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "✅ Backup created: ${BACKUP_FILE} (${SIZE})"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Remove old backups (older than RETENTION_DAYS)
echo "🧹 Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "liga_edumind_*.dump" -type f -mtime +${RETENTION_DAYS} -delete

# List current backups
echo ""
echo "📁 Current backups:"
ls -lh "${BACKUP_DIR}"/liga_edumind_*.dump 2>/dev/null || echo "No backups found"

echo ""
echo "✅ Backup complete!"
