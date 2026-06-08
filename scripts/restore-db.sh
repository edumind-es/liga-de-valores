#!/bin/bash
################################################################################
# Liga EDUmind - Database Restore Script
# Restores PostgreSQL database from backup
# Created: 2026-02-04
################################################################################

set -uo pipefail

# Configuration
BACKUP_DIR="/var/www/liga_edumind/backups"
CONTAINER_NAME="liga-edumind-db-prod"
DB_NAME="liga_edumind"
DB_USER="liga_edumind"
REMOTE="hetzner:backup/liga_edumind/db"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check arguments
if [ $# -eq 0 ]; then
    echo ""
    echo "Liga EDUmind - Database Restore"
    echo "================================"
    echo ""
    echo "Usage: $0 <backup_file.sql.gz> [--confirm]"
    echo ""
    echo "Available local backups:"
    echo "------------------------"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | awk '{print "  " $NF " (" $5 ")"}'
    echo ""
    echo "To list remote backups (Hetzner):"
    echo "  rclone ls ${REMOTE}"
    echo ""
    echo "To download from remote:"
    echo "  rclone copy ${REMOTE}/<filename> ${BACKUP_DIR}/"
    echo ""
    exit 0
fi

BACKUP_FILE="$1"
CONFIRM="${2:-}"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    # Try with backup dir prefix
    if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
        BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
    else
        error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    error "Container ${CONTAINER_NAME} is not running"
    exit 1
fi

# Get file info
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
FILE_DATE=$(stat -c %y "$BACKUP_FILE" | cut -d'.' -f1)

echo ""
echo "=========================================="
echo "Liga EDUmind - Database Restore"
echo "=========================================="
echo ""
echo "Backup file: $(basename $BACKUP_FILE)"
echo "Size: $FILE_SIZE"
echo "Date: $FILE_DATE"
echo ""

# Confirmation
if [ "$CONFIRM" != "--confirm" ]; then
    warn "This will REPLACE all data in ${DB_NAME} database!"
    warn "All current data will be LOST!"
    echo ""
    read -p "Are you sure? Type 'yes' to continue: " response
    if [ "$response" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi
fi

log "Starting restore process..."

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    log "Decompressing backup..."
    TEMP_FILE="/tmp/restore_${DB_NAME}_$(date +%s).sql"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
else
    TEMP_FILE="$BACKUP_FILE"
fi

# Verify SQL file
if ! head -1 "$TEMP_FILE" | grep -q "PostgreSQL"; then
    error "File does not appear to be a valid PostgreSQL dump"
    [ -f "/tmp/restore_${DB_NAME}"* ] && rm -f "/tmp/restore_${DB_NAME}"*
    exit 1
fi

log "Verified: Valid PostgreSQL dump file"

# Create a backup of current database before restore
log "Creating safety backup of current database..."
SAFETY_BACKUP="${BACKUP_DIR}/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
docker exec -t "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" 2>/dev/null | gzip > "$SAFETY_BACKUP"
log "Safety backup created: $SAFETY_BACKUP"

# Perform restore
log "Restoring database..."
if cat "$TEMP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null; then
    log "Database restored successfully!"
else
    error "Restore failed!"
    warn "You can restore the safety backup: $SAFETY_BACKUP"
    [ -f "/tmp/restore_${DB_NAME}"* ] && rm -f "/tmp/restore_${DB_NAME}"*
    exit 1
fi

# Cleanup temp file
[ -f "/tmp/restore_${DB_NAME}"* ] && rm -f "/tmp/restore_${DB_NAME}"*

# Verify restore by counting tables
TABLE_COUNT=$(docker exec -t "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

echo ""
echo "=========================================="
log "Restore completed successfully!"
log "Tables in database: ${TABLE_COUNT}"
log "Safety backup: ${SAFETY_BACKUP}"
echo "=========================================="
echo ""

exit 0
