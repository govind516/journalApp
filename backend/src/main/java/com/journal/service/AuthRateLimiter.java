package com.journal.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory token buckets guarding the auth endpoints.
 *
 * <p>Single-instance only: buckets live in JVM memory, so state resets on
 * restart and is not shared across replicas. If the backend ever scales
 * horizontally, these budgets must move to a shared store (new ADR).
 */
@Component
public class AuthRateLimiter {

    private final int loginCapacity;
    private final Duration loginWindow;
    private final int signupCapacity;
    private final Duration signupWindow;

    private final Map<String, Bucket> loginIpBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> loginEmailBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> signupIpBuckets = new ConcurrentHashMap<>();

    @Autowired
    public AuthRateLimiter(
            @Value("${app.rate-limit.login-per-minute:10}") int loginPerMinute,
            @Value("${app.rate-limit.signup-per-hour:10}") int signupPerHour) {
        this(loginPerMinute, Duration.ofMinutes(1), signupPerHour, Duration.ofHours(1));
    }

    AuthRateLimiter(int loginCapacity, Duration loginWindow, int signupCapacity, Duration signupWindow) {
        this.loginCapacity = loginCapacity;
        this.loginWindow = loginWindow;
        this.signupCapacity = signupCapacity;
        this.signupWindow = signupWindow;
    }

    /**
     * Attempts a login for the given client. Email is matched with the same
     * normalization as {@code AuthService} (strip + lowercase).
     *
     * @return empty when allowed, otherwise how long to wait before retrying
     */
    public Optional<Duration> tryLogin(String ip, String email) {
        String normalized = normalizeEmail(email);
        if (normalized != null) {
            Optional<Duration> wait = consume(loginEmailBuckets, normalized, loginCapacity, loginWindow);
            if (wait.isPresent()) {
                return wait;
            }
        }
        return consume(loginIpBuckets, ip, loginCapacity, loginWindow);
    }

    /**
     * Attempts a signup for the given client.
     *
     * @return empty when allowed, otherwise how long to wait before retrying
     */
    public Optional<Duration> trySignup(String ip) {
        return consume(signupIpBuckets, ip, signupCapacity, signupWindow);
    }

    private static Optional<Duration> consume(Map<String, Bucket> buckets, String key, int capacity, Duration window) {
        Bucket bucket = buckets.computeIfAbsent(key,
                k -> Bucket.builder().addLimit(Bandwidth.builder().capacity(capacity).refillIntervally(capacity, window).build()).build());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            return Optional.empty();
        }
        long seconds = Math.max(1, (probe.getNanosToWaitForRefill() + 999_999_999L) / 1_000_000_000L);
        return Optional.of(Duration.ofSeconds(seconds));
    }

    static String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String clean = email.strip().toLowerCase(Locale.ROOT);
        return clean.isEmpty() ? null : clean;
    }
}
