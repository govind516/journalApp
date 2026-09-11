package com.journal.filter;

import com.journal.model.Session;
import com.journal.model.User;
import com.journal.repository.SessionRepository;
import com.journal.repository.UserRepository;
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
                Optional<Session> session = sessionRepository.findById(token);
                if (session.isPresent() && session.get().getExpiresAt().isAfter(Instant.now())) {
                    userRepository.findById(session.get().getUserId()).ifPresent(CurrentUserHolder::set);
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
