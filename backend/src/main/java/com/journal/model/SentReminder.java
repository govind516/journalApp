package com.journal.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * Idempotency + outcome ledger for reminder sends. The PRIMARY KEY is the
 * claim itself: inserting it is the atomic act that prevents double-sends
 * across restarts and overlapping runs.
 *
 * Lifecycle per (user, date): claimed -> sent | failed (-> retried, max 3)
 * -> dead. A failed send is never confused with a successful one.
 *
 * NOTE (future push channel): the PK will need `channel` added when a
 * second channel can send to the same user on the same day. Today email is
 * the only sender, so (user_id, send_date) suffices.
 */
@Entity
@Table(name = "sent_reminders")
@Getter
@Setter
public class SentReminder {

    @EmbeddedId
    private SentReminderId id;

    @Column(nullable = false, length = 16)
    private String status = "claimed";

    @Column(nullable = false)
    private int attempts = 0;

    @Column(name = "last_error", columnDefinition = "text")
    private String lastError;

    @Column(nullable = false, length = 16)
    private String channel = "email";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
