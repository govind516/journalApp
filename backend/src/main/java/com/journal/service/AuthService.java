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
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

@Service
public class AuthService {

    public static final int SESSION_DAYS = 30;

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
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED.value(), "Email or password not recognised"));
        if (!passwordService.verify(request.getPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED.value(), "Email or password not recognised");
        }
        return user;
    }

    public String startSession(String userId) {
        byte[] tokenBytes = new byte[32];
        random.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);

        Session session = new Session();
        session.setToken(token);
        session.setUserId(userId);
        session.setExpiresAt(Instant.now().plus(SESSION_DAYS, ChronoUnit.DAYS));
        sessionRepository.save(session);
        return token;
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
