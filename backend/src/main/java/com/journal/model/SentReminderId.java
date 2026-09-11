package com.journal.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDate;

/**
 * Composite claim key: one row per user per recipient-local date.
 */
@Embeddable
@Getter
@Setter
@EqualsAndHashCode
public class SentReminderId implements Serializable {

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "send_date", nullable = false)
    private LocalDate sendDate;

    public SentReminderId() {
    }

    public SentReminderId(String userId, LocalDate sendDate) {
        this.userId = userId;
        this.sendDate = sendDate;
    }
}
