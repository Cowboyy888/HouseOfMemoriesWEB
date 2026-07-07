#!/usr/bin/env bash
set -euo pipefail

DATE=$(date +%Y%m%d-%H%M%S)
DUMP_FILE="/tmp/drivehub-${DATE}.sql"
mkdir -p /tmp/backups

PGPASSWORD="${POSTGRES_PASSWORD:-drivehub}" pg_dump -h "${POSTGRES_HOST:-postgres}" -U "${POSTGRES_USER:-drivehub}" "${POSTGRES_DB:-drivehub}" > "$DUMP_FILE"

echo "Backup created at $DUMP_FILE"
