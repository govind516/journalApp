-- V1__initial_schema.sql — canonical baseline of the journal schema.
--
-- Captured via Hibernate schema-export (ddl-auto=create) against Postgres 16
-- and hand-reviewed against backend/src/main/java/com/journal/model/*. This
-- file must never be edited; all future schema changes go in new V__ files.
--
-- Review notes (the two traps):
--   1. No COLUMN DEFAULTs anywhere. Java field initializers (User.timezone,
--      reminderEnabled, reminderTime, streakAlerts, Entry.content,
--      SentReminder.status/channel/attempts) are JPA-level only — Hibernate
--      emits no DDL defaults for them, and the export confirms none.
--   2. entries.entry_date stays character varying (YYYY-MM-DD strings by
--      convention). Converting it to date is a future migration, not baseline.
--
-- Other fidelity notes:
--   * Constraint/index names captured verbatim from the export, including the
--     Hibernate-generated FK (fk8578vf1i1ayhjalfnom5vkunj) and the implicit
--     users_email_key unique name, so ddl-auto=validate agrees with Flyway
--     -managed schemas byte-for-byte on names.
--   * idx_users_reminder_enabled (partial index) is produced at boot by
--     ReminderSchema via CREATE INDEX IF NOT EXISTS — keeping it here too is
--     harmless because the runner is idempotent.

CREATE TABLE users (
    reminder_enabled boolean NOT NULL,
    streak_alerts boolean NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    email character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    reminder_time character varying(255) NOT NULL,
    timezone character varying(255) NOT NULL
);

CREATE TABLE sessions (
    expires_at timestamp(6) with time zone NOT NULL,
    token character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL
);

CREATE TABLE entries (
    backfilled boolean NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    content text,
    entry_date character varying(255) NOT NULL,
    id character varying(255) NOT NULL,
    mood character varying(255),
    user_id character varying(255) NOT NULL
);

CREATE TABLE entry_tags (
    tag_order integer NOT NULL,
    entry_id character varying(255) NOT NULL,
    tag character varying(255)
);

CREATE TABLE sent_reminders (
    attempts integer NOT NULL,
    send_date date NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    channel character varying(16) NOT NULL,
    status character varying(16) NOT NULL,
    last_error text,
    user_id character varying(255) NOT NULL
);

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (token);

ALTER TABLE ONLY entries
    ADD CONSTRAINT entries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY entries
    ADD CONSTRAINT user_date_unique UNIQUE (user_id, entry_date);

ALTER TABLE ONLY entry_tags
    ADD CONSTRAINT entry_tags_pkey PRIMARY KEY (tag_order, entry_id);

ALTER TABLE ONLY sent_reminders
    ADD CONSTRAINT sent_reminders_pkey PRIMARY KEY (send_date, user_id);

ALTER TABLE ONLY entry_tags
    ADD CONSTRAINT fk8578vf1i1ayhjalfnom5vkunj FOREIGN KEY (entry_id) REFERENCES entries (id);

CREATE INDEX user_date_idx ON entries USING btree (user_id, entry_date);

CREATE INDEX idx_users_reminder_enabled ON users USING btree (reminder_enabled) WHERE (reminder_enabled = true);
