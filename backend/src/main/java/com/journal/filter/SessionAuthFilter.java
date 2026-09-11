package com.journal.filter;

import com.journal.model.Session;
import com.journal.model.User;
import com.journal.repository.SessionRepository;
import com.journal.repository.UserRepository;
import com.journal.service.AuthService;
import com.journal.util.CurrentUserHolder;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Optional;

/**
 * Reads the "journal_session" httpOnly cookie (if present), resolves the session + user,
 * and stashes the user in CurrentUserHolder for the duration of the request.
 *
 * This mirrors the original FastAPI get_current_user dependency: it does NOT reject
 * requests outright. Controllers that require auth call CurrentUserHolder.requireUser(),
 * which throws a 401 ApiException if no user was resolved.
 */
@Component
public class SessionAuthFilter extends OncePerRequestFilter {

    public static final String SESSION_COOKIE = "journal_session";

    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;

    public SessionAuthFilter(SessionRepository sessionRepository, UserRepository userRepository) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            String token = readCookie(request, SESSION_COOKIE);
            if (token != null) {
                Optional<Session> maybeSession = sessionRepository.findById(token);
                if (maybeSession.isPresent()) {
                    Session session = maybeSession.get();
                    Instant now = Instant.now();
                    // Both gates must pass: absolute lifetime and idle window.
                    boolean live = session.getExpiresAt().isAfter(now)
                            && session.getLastActiveAt().plus(AuthService.SESSION_IDLE_TIMEOUT).isAfter(now);
                    if (live) {
                        // Touch at most every few minutes, not on every request.
                        if (session.getLastActiveAt().plus(AuthService.SESSION_TOUCH_THRESHOLD).isBefore(now)) {
                            session.setLastActiveAt(now);
                            sessionRepository.save(session);
                        }
                        userRepository.findById(session.getUserId()).ifPresent(CurrentUserHolder::set);
                    } else {
                        sessionRepository.delete(session);
                    }
                }
            }
            chain.doFilter(request, response);
        } finally {
            CurrentUserHolder.clear();
        }
    }

    private String readCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (name.equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }
}
