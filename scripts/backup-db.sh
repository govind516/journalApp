#!/bin/sh
# JournalApp scheduled database backup (pg_dump).
# Runs inside the db-backup compose service (postgres:16-alpine image, so
# pg_dump always matches the server version). Connection comes from the
# standard libpq env vars (PGHOST/PGUSER/PGPASSWORD/PGDATABASE).
set -eu

: "${PGHOST:?PGHOST must be set}"
: "${PGUSER:?PGUSER must be set}"
: "${PGPASSWORD:?PGPASSWORD must be set}"
: "${PGDATABASE:?PGDATABASE must be set}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/journal-$STAMP.sql"
TMP="$FILE.tmp"

mkdir -p "$BACKUP_DIR"
echo "[backup] starting pg_dump of $PGDATABASE@$PGHOST -> $FILE"
if pg_dump --no-owner --dbname="$PGDATABASE" > "$TMP" 2>/tmp/pg_dump.err; then
  if [ ! -s "$TMP" ]; then
    echo "[backup] ERROR: pg_dump produced an empty artifact; discarding" >&2
    rm -f "$TMP"
    exit 1
  fi
  mv "$TMP" "$FILE"
  echo "[backup] OK: $(wc -c < "$FILE") bytes -> $FILE"
else
  code=$?
  echo "[backup] ERROR: pg_dump failed (exit $code) for $PGDATABASE@$PGHOST" >&2
  cat /tmp/pg_dump.err >&2 || true
  rm -f "$TMP"
  exit 1
fi

# Retention: keep the last RETENTION_DAYS days of dumps.
echo "[backup] retention: keeping last $RETENTION_DAYS day(s)"
# shellcheck disable=SC2086
find "$BACKUP_DIR" -maxdepth 1 -name 'journal-*.sql' -mtime +"$RETENTION_DAYS" -print -delete
echo "[backup] done"
