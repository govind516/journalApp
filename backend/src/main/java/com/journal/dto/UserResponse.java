package com.journal.dto;

import com.journal.model.User;
import lombok.Getter;

import java.time.Instant;

@Getter
public class UserResponse {
    private final String id;
    private final String email;
    private final String name;
    private final String timezone;
    private final boolean reminderEnabled;
    private final String reminderTime;
    private final boolean streakAlerts;
    private final Instant createdAt;

    public UserResponse(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.name = user.getName();
        this.timezone = user.getTimezone();
        this.reminderEnabled = user.isReminderEnabled();
        this.reminderTime = user.getReminderTime();
        this.streakAlerts = user.isStreakAlerts();
        this.createdAt = user.getCreatedAt();
    }
}
