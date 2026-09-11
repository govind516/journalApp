# Offline chaos drill (verified 2026-09-12, live compose stack)

Question: if the backend or database dies mid-write, does the app lie,
hang, lose data, or degrade honestly? Method: Playwright-driven real UI
against compose, `docker kill` (SIGKILL, no graceful shutdown), observe.

## Scenario A — backend killed mid-write

* In-flight PUT committed-or-not is atomic (single-row upsert): the killed
  write landed **fully intact** (complete row, byte-identical content) —
  no half-committed state is representable.
* Later attempts fail as `ERR_CONNECTION_REFUSED`; the save indicator shows
  **"Will save when you return"** and the full payload persists to the
  `journal-write-queue` in localStorage (survives reload). No spinner hang,
  no fake success at failure time.
* After backend recovery with no further interaction, the indicator reverts
  to the idle **"Saved"** copy while the write is still only queued.
  ⚠️ Known wrinkle (minor, no data risk): the idle label is
  indistinguishable from a real success. Typing more self-heals via a fresh
  save; the stale queued item can never clobber it (flush takes the
  conflict path and preserves queued words as a draft).
* Queued items do NOT auto-flush on backend recovery — flush only fires on
  browser `online` events or continued typing. A user who idles post-outage
  keeps the item queued until reload/reconnect flap.

## Scenario B — postgres killed mid-session

* Backend fails fast (`UnknownHostException: postgres` once Docker DNS drops
  the dead container — no 30s pool hang); UI lands on the same honest
  queued path as scenario A, offline pill stays hidden (browser never went
  "offline"), no hang.
* Recovery required **no backend restart**: Hikari repopulated the pool on
  its own once postgres returned; app loads, drafts restore the unsent
  text into the editor.
* Data intact: kill-then-restore loses nothing committed (volume untouched
  by a container kill — only `volume rm` destroys data, see BACKUP_RESTORE).

## Design strengths confirmed live

Single-statement upserts (no partial writes), localStorage write queue +
drafts (no lost keystrokes), conflict-safe flush (stale queue can't overwrite
newer server content), honest failure copy at the moment of failure.

## Follow-ups (not bugs demanding fixes)

1. Idle "Saved" copy after an unsaved failure (scenario A) — consider a
   distinct "Waiting to save" idle state when the queue is non-empty.
2. No auto-flush on backend recovery without user action — consider flushing
   on a successful heartbeat/poll, not just `online` events.
3. Offline pill doesn't reflect queued-but-browser-online state — the save
   label is currently the only signal.
