package com.journal.repository;

import com.journal.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);

    /**
     * Reminder candidates. Backed by the partial index
     * idx_users_reminder_enabled (reminder_enabled = true only), so the
     * 10-minute scan touches opted-in rows instead of the whole table.
     */
    @Query("SELECT u FROM User u WHERE u.reminderEnabled = true")
    List<User> findReminderCandidates();
}
