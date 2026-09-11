package com.journal.service;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthRateLimiterTest {

    private static AuthRateLimiter limiter() {
        return new AuthRateLimiter(2, Duration.ofMillis(300), 2, Duration.ofMillis(300));
    }

    @Test
    void allowsUpToCapacityThenReportsWait() {
        AuthRateLimiter limiter = limiter();
        assertEquals(Optional.empty(), limiter.tryLogin("1.1.1.1", "a@example.com"));
        assertEquals(Optional.empty(), limiter.tryLogin("1.1.1.1", "a@example.com"));
        Optional<Duration> wait = limiter.tryLogin("1.1.1.1", "a@example.com");
        assertTrue(wait.isPresent(), "third attempt inside the window must be limited");
        assertTrue(!wait.get().isNegative() && !wait.get().isZero());
    }

    @Test
    void refillsAfterWindow() throws InterruptedException {
        AuthRateLimiter limiter = limiter();
        limiter.tryLogin("2.2.2.2", "b@example.com");
        limiter.tryLogin("2.2.2.2", "b@example.com");
        assertTrue(limiter.tryLogin("2.2.2.2", "b@example.com").isPresent());
        Thread.sleep(400);
        assertEquals(Optional.empty(), limiter.tryLogin("2.2.2.2", "b@example.com"));
    }

    @Test
    void keysAreIndependent() {
        AuthRateLimiter limiter = limiter();
        limiter.tryLogin("3.3.3.3", "c@example.com");
        limiter.tryLogin("3.3.3.3", "c@example.com");
        assertTrue(limiter.tryLogin("3.3.3.3", "c@example.com").isPresent());
        // A fresh IP with a fresh email is unaffected by the exhausted budgets above.
        assertEquals(Optional.empty(), limiter.tryLogin("4.4.4.4", "d@example.com"));
        // Signup budgets are separate from login budgets.
        assertEquals(Optional.empty(), limiter.trySignup("3.3.3.3"));
    }

    @Test
    void missingEmailStillEnforcesIpBudget() {
        AuthRateLimiter limiter = limiter();
        assertEquals(Optional.empty(), limiter.tryLogin("5.5.5.5", null));
        assertEquals(Optional.empty(), limiter.tryLogin("5.5.5.5", "   "));
        assertTrue(limiter.tryLogin("5.5.5.5", null).isPresent());
    }

    @Test
    void emailIsNormalizedLikeAuthService() {
        assertEquals("user@example.com", AuthRateLimiter.normalizeEmail("  User@Example.COM "));
    }
}
