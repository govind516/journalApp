-- V2__add_session_last_active.sql — idle-timeout support for DB sessions.
--
-- Adds sessions.last_active_at (touched on valid requests) and backfills
-- existing rows to their creation instant. Creation time is not stored, but
-- every row's expires_at was set to created_at + 30 days, so
-- expires_at - 30 days reconstructs it exactly. Immutable after this file:
-- future changes go in new V__ files.

ALTER TABLE sessions ADD COLUMN last_active_at timestamp(6) with time zone;

UPDATE sessions SET last_active_at = expires_at - INTERVAL '30 days' WHERE last_active_at IS NULL;

ALTER TABLE sessions ALTER COLUMN last_active_at SET NOT NULL;
