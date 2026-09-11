package com.journal.service;

import com.journal.model.SentReminder;
import com.journal.model.SentReminderId;
import com.journal.model.User;
import com.journal.repository.EntryRepository;
import com.journal.repository.SentReminderRepository;
import com.journal.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

/**
 * Email nudges, local-first and idempotent.
 *
 * Each user+date is claimed by inserting the PK row (concurrent runs race
 * on the constraint; the loser skips). The Brevo call always happens
 * OUTSIDE any database transaction, followed by a short status update —
 * a failed send stays visible as failed and is retried, never confused
 * with a success. Without a BREVO_API_KEY the job logs once and sleeps.
 */
@Service
public class ReminderService {

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);
    private static final int MAX_ATTEMPTS = 3;
    private static final long UNSUBSCRIBE_DAYS = 30;

    private final UserRepository userRepository;
    private final EntryRepository entryRepository;
    private final SentReminderRepository sentReminderRepository;
    private final BrevoClient brevo;
    private final String appOrigin;
    private final byte[] signingSecret;
    private final boolean secretEphemeral;

    public ReminderService(
            UserRepository userRepository,
            EntryRepository entryRepository,
            SentReminderRepository sentReminderRepository,
            BrevoClient brevo,
            Environment env,
            @Value("${REMINDER_SIGNING_SECRET:}") String secret,
            @Value("${APP_ORIGIN:http://localhost:5173}") String appOrigin) {
        this.userRepository = userRepository;
        this.entryRepository = entryRepository;
        this.sentReminderRepository = sentReminderRepository;
        this.brevo = brevo;
        this.appOrigin = appOrigin;
        boolean prod = Arrays.asList(env.getActiveProfiles()).contains("prod");
        if ((secret == null || secret.isBlank())) {
            if (prod) {
                throw new IllegalStateException("REMINDER_SIGNING_SECRET is required when the prod profile is active — refusing to start with forgeable unsubscribe tokens");
            }
            byte[] random = new byte[32];
            new SecureRandom().nextBytes(random);
            this.signingSecret = random;
            this.secretEphemeral = true;
            log.warn("REMINDER_SIGNING_SECRET is not set — using an ephemeral secret; unsubscribe links expire on restart (dev only)");
        } else {
            this.signingSecret = secret.getBytes(StandardCharsets.UTF_8);
            this.secretEphemeral = false;
        }
        if (!brevo.configured()) {
            log.info("BREVO_API_KEY is not set — email reminders are disabled; the job will sleep");
        } else {
            log.info("Email reminders enabled");
        }
    }

    @Scheduled(fixedDelay = 10 * 60 * 1000)
    public void sendDueReminders() {
        if (!brevo.configured()) return;
        for (User user : userRepository.findReminderCandidates()) {
            try {
                handleUser(user);
            } catch (Exception ex) {
                // One bad user (bad timezone, bad address) never kills the run.
                log.warn("Reminder handling failed for user {}", user.getId());
            }
        }
    }

    void handleUser(User user) throws Exception {
        ZoneId zone = zoneOf(user.getTimezone());
        LocalDate today = LocalDate.now(zone);
        LocalTime now = LocalTime.now(zone);
        LocalTime at;
        try {
            at = LocalTime.parse(user.getReminderTime());
        } catch (Exception ex) {
            return;
        }
        if (now.isBefore(at) || now.isAfter(at.plusMinutes(15))) return;

        SentReminderId id = new SentReminderId(user.getId(), today);
        SentReminder row = currentRow(id);
        if (row == null) return; // sent, skipped, dead, owned elsewhere, or lost the claim race

        boolean wrote = entryRepository.findByUserIdAndDate(user.getId(), today.toString())
                .map(e -> e.getContent() != null && !e.getContent().isBlank())
                .orElse(false);
        if (wrote) {
            mark(row, "skipped", null);
            return;
        }

        try {
            brevo.send(user.getEmail(), "Your page is waiting",
                    "A few true sentences are enough. There is no right length.\n\n"
                    + "Open your journal when you have a quiet minute.\n\n"
                    + "Done with these nudges? Unsubscribe here (no login needed):\n"
                    + unsubscribeLink(user));
            mark(row, "sent", null);
        } catch (Exception ex) {
            row.setAttempts(row.getAttempts() + 1);
            mark(row, row.getAttempts() >= MAX_ATTEMPTS ? "dead" : "failed", ex.getMessage());
        }
    }

    /**
     * Resolves today's actionable row: terminal states and foreign claims
     * stand down; a failed row retries; a missing row is claimed (null when
     * the claim race is lost). A stale claim (crashed between claim and
     * complete) is adopted so it retries instead of sitting invisible.
     *
     * NOTE: single scheduler instance only. If this job ever runs on
     * multiple instances, stale-claim adoption needs SELECT ... FOR UPDATE
     * SKIP LOCKED (or similar) or two instances can double-send.
     */
    SentReminder currentRow(SentReminderId id) {
        Optional<SentReminder> existing = sentReminderRepository.findById(id);
        if (existing.isPresent()) {
            SentReminder row = existing.get();
            switch (row.getStatus()) {
                case "sent", "skipped", "dead" -> { return null; }
                case "failed" -> {
                    if (row.getAttempts() >= MAX_ATTEMPTS) {
                        mark(row, "dead", null);
                        return null;
                    }
                    return row;
                }
                default -> {
                    if (row.getUpdatedAt().isBefore(Instant.now().minusSeconds(15 * 60))) {
                        row.setAttempts(row.getAttempts() + 1);
                        if (row.getAttempts() >= MAX_ATTEMPTS) {
                            mark(row, "dead", "stale claim adopted too many times");
                            return null;
                        }
                        mark(row, "claimed", null);
                        return row;
                    }
                    return null; // fresh claim: another run owns it
                }
            }
        }
        return claim(id).orElse(null);
    }

    /** Atomic claim: empty when another run already owns this user+date. */
    Optional<SentReminder> claim(SentReminderId id) {
        if (sentReminderRepository.existsById(id)) return Optional.empty();
        try {
            SentReminder row = new SentReminder();
            row.setId(id);
            row.setStatus("claimed");
            row.setAttempts(0);
            row.setChannel("email");
            row.setCreatedAt(Instant.now());
            row.setUpdatedAt(Instant.now());
            return Optional.ofNullable(sentReminderRepository.save(row));
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            return Optional.empty();
        }
    }

    void mark(SentReminder row, String status, String error) {
        row.setStatus(status);
        row.setLastError(error);
        row.setUpdatedAt(Instant.now());
        sentReminderRepository.save(row);
    }

    public String unsubscribeLink(User user) {
        long expiry = Instant.now().plusSeconds(UNSUBSCRIBE_DAYS * 24 * 60 * 60).getEpochSecond();
        String payload = user.getId() + ":" + expiry;
        String sig = HexFormat.of().formatHex(hmac(payload));
        String token = Base64.getUrlEncoder().withoutPadding()
                .encodeToString((payload + ":" + sig).getBytes(StandardCharsets.UTF_8));
        return appOrigin + "/unsubscribe?token=" + token;
    }

    /** Returns the user id when the token is authentic and unexpired. */
    public Optional<String> verifyUnsubscribeToken(String token) {
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
            String[] parts = decoded.split(":", 3);
            if (parts.length != 3) return Optional.empty();
            String payload = parts[0] + ":" + parts[1];
            String expected = HexFormat.of().formatHex(hmac(payload));
            if (!constantTimeEquals(expected, parts[2])) return Optional.empty();
            if (Instant.ofEpochSecond(Long.parseLong(parts[1])).isBefore(Instant.now())) return Optional.empty();
            return Optional.of(parts[0]);
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    private byte[] hmac(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingSecret, "HmacSHA256"));
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) result |= a.charAt(i) ^ b.charAt(i);
        return result == 0;
    }

    private static ZoneId zoneOf(String timezone) {
        try {
            return ZoneId.of(timezone == null || timezone.isBlank() ? "UTC" : timezone);
        } catch (Exception ex) {
            return ZoneId.of("UTC");
        }
    }
}
