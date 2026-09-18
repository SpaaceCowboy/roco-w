#!/usr/bin/env bash
#
# Restore a PostgreSQL custom-format content backup produced by
# scripts/backup-content-db.sh.
#
# DESTRUCTIVE: pg_restore --clean drops any object that also exists in the
# dump. Use this against a scratch database to practise a restore, or against
# the real database only during an actual recovery. Never point it at the real
# database just to "check that the backup works".
#
# Requires DATABASE_URL pointing at the target database and pg_restore. If the
# matching .sha256 file is present, the dump is verified first.
#
# This script has not been exercised against the production database yet; see
# docs/admin-runbook.md for the outstanding restore drill.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
FILE="${1:?usage: restore-content-db.sh <dump-file>}"

if [[ ! -f "$FILE" ]]; then
  echo "no such dump: ${FILE}" >&2
  exit 1
fi

if [[ -f "${FILE}.sha256" ]]; then
  sha256sum --check "${FILE}.sha256"
fi

read -r -p "Restore ${FILE} into the database in DATABASE_URL and drop matching objects? Type 'restore' to continue: " answer
if [[ "$answer" != "restore" ]]; then
  echo "aborted"
  exit 1
fi

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$DATABASE_URL" \
  "$FILE"

echo "restore finished: ${FILE}"
