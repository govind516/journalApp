# Backup & restore runbook (verified 2026-09-12)

## What actually protects data today

**`pg_dump` of the `journaldb` database — full fidelity** (users, entries,
sessions, reminders, Flyway history). This is the only tested restore path.

**`BackupService` is NOT a disaster-recovery backup.** Verified by code
reading plus live check (no `backups/` directory exists in the backend
container because the feature never runs):

* Disabled unless `BACKUP_PASSPHRASE` is set (unset everywhere today).
* Exports **entries only** — users, sessions, and reminders are not included.
* Writes into the container's local `backups/` dir with **no volume mount**
  — artifacts die with the container.
* **No restore path exists**: nothing decrypts these zips or feeds them
  back (the closest tool, `POST /api/import`, speaks different formats).

Follow-ups before `BackupService` can be trusted: mount a persistent volume
for `backups/`, document/implement decrypt → re-import, or retire it in
favor of the `pg_dump` flow below.

## Verified restore procedure (full drill, ~10 min wall)

Preconditions: a `pg_dump --no-owner` artifact of `journaldb`.

```bash
# 1. Back up (do this regularly; the drill used a manual dump)
docker exec journal-postgres-app pg_dump -U journal -d journaldb --no-owner \
  > journal-backup-YYYYMMDD.sql

# 2. Fingerprint before touching anything
docker exec journal-postgres-app psql -U journal -d journaldb -t \
  -c "select 'users='||count(*) from users;" \
  -c "select 'entries='||count(*) from entries;" \
  -c "select md5(string_agg(id||entry_date||content||coalesce(mood,''), '|' order by entry_date)) from entries;"

# 3. Simulate loss (dev only — destroys the volume)
docker compose down
docker volume rm journalapp_journal_pg_data
docker compose up -d postgres   # fresh empty DB; wait for healthy

# 4. Restore
docker cp journal-backup-YYYYMMDD.sql journal-postgres-app:/tmp/restore.sql
docker exec journal-postgres-app psql -U journal -d journaldb -f /tmp/restore.sql
# expect exit 0 with no ERROR lines

# 5. Re-run step 2 — counts and content hash must match exactly.

# 6. Bring the app back and prove it serves the restored data
docker compose up -d backend frontend
# login as a known user, GET a known entry, confirm byte-identical content;
# backend log must show Flyway "up to date" (history table restores too).
```

## Drill record

* Loss: volume removed (`journalapp_journal_pg_data` deleted, fresh empty DB).
* Restore: `psql -f` exit 0, zero errors; users 4/4, entries 2/2, content
  md5 identical (`1cb37267…`); drill login returned the same user id and
  the restored entry read back byte-identical, frontend 200, all services
  healthy. Backend log confirmed Flyway "validated / up to date".
* Nothing was documented before this drill — the procedure above was
  reverse-engineered from the compose setup and verified live here.

## Still manual (script on next pass)

Fingerprinting, dump rotation/retention, off-host copy of artifacts, and
the restore verification queries are all hand-run. A `scripts/` backup job
(scheduled dump + retention + alert on failure) is the natural follow-up.
