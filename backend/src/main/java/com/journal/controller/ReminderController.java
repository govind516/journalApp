package com.journal.controller;

import com.journal.model.User;
import com.journal.repository.UserRepository;
import com.journal.service.ReminderService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * No-login unsubscribe: the signed token is the authorization.
 * Flipping a boolean is naturally idempotent — first click or fiftieth.
 */
@RestController
@RequestMapping("/api/reminders")
public class ReminderController {

    private final ReminderService reminders;
    private final UserRepository users;

    public ReminderController(ReminderService reminders, UserRepository users) {
        this.reminders = reminders;
        this.users = users;
    }

    @GetMapping("/unsubscribe")
    public Unsubscribed unsubscribe(@RequestParam("token") String token) {
        String userId = reminders.verifyUnsubscribeToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "This link is invalid or expired"));
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "This link is invalid or expired"));
        user.setReminderEnabled(false);
        users.save(user);
        return new Unsubscribed(true);
    }

    public record Unsubscribed(boolean ok) {
    }
}
