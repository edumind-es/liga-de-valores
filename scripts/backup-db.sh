#!/bin/bash
################################################################################
# Liga EDUmind - Database Backup Script
# Backs up PostgreSQL database from Docker container
# Created: 2026-02-04
################################################################################

set -Eeuo pipefail

# Configuration
PROJECT_DIR="/var/www/liga_edumind"
BACKUP_DIR="/var/www/liga_edumind/backups"
CONTAINER_NAME="liga-edumind-db-prod"
DB_NAME="liga_edumind"
DB_USER="liga_edumind"
RETENTION_DAYS=30
REMOTE="hetzner:backup/liga_edumind/db"
LOG_FILE="/var/www/liga_edumind/backups/backup.log"

# Timestamp
TS=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="backup_${DB_NAME}_${TS}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Starting Liga EDUmind database backup"
log "=========================================="

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "ERROR: Container ${CONTAINER_NAME} is not running"
    exit 1
fi

# Perform backup using pg_dump inside container
log "Dumping database ${DB_NAME}..."
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists > "$BACKUP_PATH" 2>/dev/null; then
    # Check if backup has content
    if [ -s "$BACKUP_PATH" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        log "SUCCESS: Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

        # Compress backup
        log "Compressing backup..."
        gzip -f "$BACKUP_PATH"
        COMPRESSED_FILE="${BACKUP_PATH}.gz"
        COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
        log "SUCCESS: Compressed to ${COMPRESSED_SIZE}"

        # Verify backup integrity (can decompress)
        log "Verifying backup integrity..."
        if gzip -t "$COMPRESSED_FILE" 2>/dev/null; then
            log "SUCCESS: Backup integrity verified"
        else
            log "ERROR: Backup integrity check failed"
            exit 1
        fi

        # Sync to remote (Hetzner)
        if command -v rclone &> /dev/null; then
            log "Syncing to remote storage (Hetzner)..."
            if rclone copy "$COMPRESSED_FILE" "$REMOTE" --config /home/nuevoadmin/.config/rclone/rclone.conf 2>/dev/null; then
                log "SUCCESS: Backup synced to ${REMOTE}"
            else
                rclone_exit=$?
                log "WARNING: Failed to sync to remote (rclone exit ${rclone_exit}). Backup remains safe locally."
            fi
        else
            log "WARNING: rclone not available, skipping remote sync"
        fi

        # Clean up old local backups
        log "Cleaning up backups older than ${RETENTION_DAYS} days..."
        DELETED=$(find "$BACKUP_DIR" -name "backup_${DB_NAME}_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
        log "Deleted ${DELETED} old backup(s)"

        # Clean up old remote backups
        if command -v rclone &> /dev/null; then
            log "Cleaning up remote backups older than ${RETENTION_DAYS} days..."
            rclone delete --min-age "${RETENTION_DAYS}d" "$REMOTE" --config /home/nuevoadmin/.config/rclone/rclone.conf 2>/dev/null || true
        fi

    else
        log "ERROR: Backup file is empty"
        rm -f "$BACKUP_PATH"
        exit 1
    fi
else
    log "ERROR: pg_dump failed"
    rm -f "$BACKUP_PATH"
    exit 1
fi

# Summary
log "=========================================="
log "Backup completed successfully"
log "Local: ${COMPRESSED_FILE}"
log "Remote: ${REMOTE}/${BACKUP_FILE}.gz"
log "=========================================="

exit 0
