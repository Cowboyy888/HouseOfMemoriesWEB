#!/usr/bin/env bash
set -euo pipefail

DATE=$(date +%Y%m%d-%H%M%S)
mkdir -p /tmp/backups
DUMP_FILE="/tmp/backups/drivehub-${DATE}.sql"

PGPASSWORD="${POSTGRES_PASSWORD:-drivehub}" pg_dump -h "${POSTGRES_HOST:-postgres}" -U "${POSTGRES_USER:-drivehub}" "${POSTGRES_DB:-drivehub}" > "$DUMP_FILE"

echo "Backup created at $DUMP_FILE"
