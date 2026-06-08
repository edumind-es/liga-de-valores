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
# ============================================================================
# EDUmind Liga - Database Backup Script
# Requires: Docker
# ============================================================================
set -e

# Configuration
BACKUP_DIR="/var/www/liga_edumind/backups"
CONTAINER_NAME="liga-edumind-db-prod"
DB_USER="liga_edumind"
DB_NAME="liga_edumind"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="backup_${DB_NAME}_${DATE}.sql.gz"
RETENTION_DAYS=30

echo "[$(date)] 🚀 Starting database backup for $DB_NAME..."

# Ensure directory exists
mkdir -p $BACKUP_DIR

# Exec dump inside container and compress
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/$FILENAME"

# Verify file size
FILESIZE=$(stat -c%s "$BACKUP_DIR/$FILENAME")
echo "[$(date)] ✅ Backup created: $FILENAME ($FILESIZE bytes)"

# Cleanup old backups
echo "[$(date)] 🧹 Cleaning up backups older than $RETENTION_DAYS days..."
find $BACKUP_DIR -name "backup_${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] ✨ Backup process completed successfully."
