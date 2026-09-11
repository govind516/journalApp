package com.journal.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Reminder DDL the ORM cannot express: the partial index behind the
 * 10-minute candidate scan. Entities + ddl-auto own the table itself;
 * this guard only adds the index, idempotently, at boot.
 */
@Component
public class ReminderSchema implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ReminderSchema.class);

    private final JdbcTemplate jdbc;

    public ReminderSchema(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_users_reminder_enabled "
                + "ON users (reminder_enabled) WHERE reminder_enabled = true");
        log.info("Reminder candidate index ensured");
    }
}
