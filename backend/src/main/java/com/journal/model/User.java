package com.journal.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "users", uniqueConstraints = @UniqueConstraint(columnNames = "email"))
@Getter
@Setter
public class User {

    @Id
    private String id;

    public String getId() {
        return id;
    }

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String timezone = "UTC";

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "reminder_enabled", nullable = false)
    private boolean reminderEnabled = false;

    @Column(name = "reminder_time", nullable = false)
    private String reminderTime = "20:00";

    @Column(name = "streak_alerts", nullable = false)
    private boolean streakAlerts = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
