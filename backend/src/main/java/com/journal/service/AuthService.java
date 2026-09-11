package com.journal.service;

import com.journal.dto.LoginRequest;
import com.journal.dto.SignupRequest;
import com.journal.exception.ApiException;
import com.journal.model.Session;
import com.journal.model.User;
import com.journal.repository.EntryRepository;
import com.journal.repository.SessionRepository;
import com.journal.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    public static final int SESSION_DAYS = 30;
    public static final Duration SESSION_IDLE_TIMEOUT = Duration.ofHours(12);
    public static final Duration SESSION_TOUCH_THRESHOLD = Duration.ofMinutes(5);
    public static final int MAX_SESSIONS_PER_USER = 5;

    /**
     * Timing ballast, not a secret: a well-formed hash run through the real
     * verify path when no account exists, so a missing account costs the same
     * PBKDF2 work as a wrong password. Never rotate or treat as sensitive —
     * its value is irrelevant, only its cost matters.
     */
    private static final String DUMMY_HASH =
            "18a69cb1c8dadd1033bef80a15db5a85$507459429787b17f1431280dc801cf76d2dd54d088243b883c6996938cc89ceb";

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final EntryRepository entryRepository;
    private final PasswordService passwordService;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository userRepository, SessionRepository sessionRepository, EntryRepository entryRepository, PasswordService passwordService) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.entryRepository = entryRepository;
        this.passwordService = passwordService;
    }

    public User signup(SignupRequest request) {
        String email = request.getEmail().strip().toLowerCase();
        if (userRepository.findByEmail(email).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT.value(), "An account with that email already exists");
        }
        User user = new User();
        user.setId(UUID.randomUUID().toString());
        user.setEmail(email);
        user.setName(request.getName().strip());
        user.setTimezone(request.getTimezone() == null || request.getTimezone().isBlank() ? "UTC" : request.getTimezone());
        user.setPasswordHash(passwordService.hash(request.getPassword()));
        user.setCreatedAt(Instant.now());
        return userRepository.save(user);
    }

    public User login(LoginRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().strip().toLowerCase();
        String supplied = request.getPassword();
        Optional<User> maybeUser = userRepository.findByEmail(email);
        if (maybeUser.isEmpty()) {
            // Same work as the wrong-password path below: one lookup (above)
            // plus one full verify. Result discarded.
            passwordService.verify(supplied, DUMMY_HASH);
            throw new ApiException(HttpStatus.UNAUTHORIZED.value(), "Email or password not recognised");
        }
        User user = maybeUser.get();
        if (!passwordService.verify(supplied, user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED.value(), "Email or password not recognised");
        }
        return user;
    }

    @Transactional
    public String startSession(String userId) {
        byte[] tokenBytes = new byte[32];
        random.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);

        Instant now = Instant.now();
        Session session = new Session();
        session.setToken(token);
        session.setUserId(userId);
        session.setExpiresAt(now.plus(SESSION_DAYS, ChronoUnit.DAYS));
        session.setLastActiveAt(now);
        sessionRepository.save(session);
        evictOldestBeyondCap(userId, token, now);
        return token;
    }

    /**
     * Keeps at most MAX_SESSIONS_PER_USER live sessions. Oldest go first —
     * ordered by expiry, which tracks creation order since every session
     * lives exactly SESSION_DAYS. The just-created session is never evicted.
     */
    private void evictOldestBeyondCap(String userId, String newToken, Instant now) {
        List<Session> live =
                sessionRepository.findByUserIdAndExpiresAtAfterOrderByExpiresAtAsc(userId, now);
        int excess = live.size() - MAX_SESSIONS_PER_USER;
        for (Session candidate : live) {
            if (excess <= 0) {
                break;
            }
            if (candidate.getToken().equals(newToken)) {
                continue;
            }
            sessionRepository.delete(candidate);
            excess--;
        }
    }

    @Transactional
    public void endSession(String token) {
        if (token != null) {
            sessionRepository.deleteByToken(token);
        }
    }

    /** Removes every trace of the account: entries, sessions, then the user. */
    @Transactional
    public void deleteAccount(String userId) {
        entryRepository.deleteByUserId(userId);
        sessionRepository.deleteByUserId(userId);
        userRepository.deleteById(userId);
    }
}
