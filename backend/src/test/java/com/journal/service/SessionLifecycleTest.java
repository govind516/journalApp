package com.journal.service;

import com.journal.model.Session;
import com.journal.model.User;
import com.journal.repository.SessionRepository;
import com.journal.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Session lifecycle: 12h idle expiry independent of the 30d absolute cap,
 * oldest-evicts-first cap of 5, and daily purge hygiene.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SessionLifecycleTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UserRepository users;

    @Autowired
    private SessionRepository sessions;

    @Autowired
    private AuthService auth;

    @Autowired
    private SessionPurgeService purge;

    private User newUser(String email) {
        User user = new User();
        user.setId(UUID.randomUUID().toString());
        user.setEmail(email);
        user.setName("Lifecycle");
        user.setPasswordHash("test-hash");
        user.setCreatedAt(Instant.now());
        return users.save(user);
    }

    private Session newSession(String userId, Instant lastActive, Instant expiresAt) {
        Session session = new Session();
        session.setToken(UUID.randomUUID().toString().replace("-", ""));
        session.setUserId(userId);
        session.setLastActiveAt(lastActive);
        session.setExpiresAt(expiresAt);
        return sessions.save(session);
    }

    private int meStatus(String token) throws Exception {
        return mvc.perform(get("/api/auth/me").cookie(new Cookie("journal_session", token)))
                .andReturn().getResponse().getStatus();
    }

    @Test
    void idleExpiryIndependentOfAbsolute() throws Exception {
        User user = newUser("idle-lifecycle@example.com");
        Instant now = Instant.now();
        Session fresh = newSession(user.getId(), now.minus(11, ChronoUnit.HOURS), now.plus(30, ChronoUnit.DAYS));
        Session stale = newSession(user.getId(), now.minus(13, ChronoUnit.HOURS), now.plus(30, ChronoUnit.DAYS));
        Instant before = fresh.getLastActiveAt();

        assertEquals(200, meStatus(fresh.getToken()));
        assertEquals(401, meStatus(stale.getToken()));

        // Valid request touched the row (compare against the pre-request
        // snapshot: same persistence context returns the same instance);
        // idle-expired row was removed on encounter.
        assertTrue(sessions.findById(fresh.getToken()).orElseThrow().getLastActiveAt().isAfter(before));
        assertFalse(sessions.findById(stale.getToken()).isPresent());
    }

    @Test
    void absoluteExpiryHoldsDespiteRecentActivity() throws Exception {
        User user = newUser("absolute-lifecycle@example.com");
        Instant now = Instant.now();
        Session old = newSession(user.getId(), now, now.minus(1, ChronoUnit.HOURS));

        assertEquals(401, meStatus(old.getToken()));
    }

    @Test
    void sixthLoginEvictsOldestLeavingFive() {
        User user = newUser("cap-lifecycle@example.com");
        List<String> tokens = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            tokens.add(auth.startSession(user.getId()));
        }

        List<Session> remaining =
                sessions.findByUserIdAndExpiresAtAfterOrderByExpiresAtAsc(user.getId(), Instant.now());
        assertEquals(5, remaining.size());
        assertFalse(sessions.findById(tokens.get(0)).isPresent(), "oldest session must be evicted");
        for (int i = 1; i < 6; i++) {
            assertTrue(sessions.findById(tokens.get(i)).isPresent());
        }
    }

    @Test
    void purgeRemovesOnlyExpired() {
        User user = newUser("purge-lifecycle@example.com");
        Instant now = Instant.now();
        Session expired = newSession(user.getId(), now.minus(31, ChronoUnit.DAYS), now.minus(1, ChronoUnit.DAYS));
        Session live = newSession(user.getId(), now, now.plus(30, ChronoUnit.DAYS));

        purge.purgeExpired();

        assertFalse(sessions.findById(expired.getToken()).isPresent());
        assertTrue(sessions.findById(live.getToken()).isPresent());
    }
}
