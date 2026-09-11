package com.journal.repository;

import com.journal.model.SentReminder;
import com.journal.model.SentReminderId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SentReminderRepository extends JpaRepository<SentReminder, SentReminderId> {
}
