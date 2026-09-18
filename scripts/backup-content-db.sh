#!/usr/bin/env bash
#
# Back up the content database in PostgreSQL custom format.
#
# Requires DATABASE_URL and the PostgreSQL client tools (pg_dump, sha256sum).
# Writes to CONTENT_BACKUP_DIR (default /var/backups/rocobroker-content) and
# prunes dumps older than CONTENT_BACKUP_RETAIN_DAYS (default 14).
#
# This script has not been exercised against the production database yet; see
# docs/admin-runbook.md for the outstanding restore drill.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"

BACKUP_DIR="${CONTENT_BACKUP_DIR:-/var/backups/rocobroker-content}"
RETAIN_DAYS="${CONTENT_BACKUP_RETAIN_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${BACKUP_DIR}/content-${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

# --no-owner/--no-privileges keep the dump portable across roles and hosts.
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$FILE" \
  "$DATABASE_URL"

sha256sum "$FILE" > "${FILE}.sha256"

find "$BACKUP_DIR" -name 'content-*.dump' -mtime "+${RETAIN_DAYS}" -delete
find "$BACKUP_DIR" -name 'content-*.dump.sha256' -mtime "+${RETAIN_DAYS}" -delete

echo "backup written: ${FILE}"
echo "sha256: $(cut -d' ' -f1 "${FILE}.sha256")"
