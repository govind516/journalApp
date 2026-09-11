package com.journal.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.journal.dto.ApiError;
import com.journal.service.AuthRateLimiter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.time.Duration;
import java.util.Optional;

/**
 * Rejects brute-force traffic against the auth endpoints before any auth
 * logic runs, so a 429 reveals nothing about whether the underlying attempt
 * would have succeeded. Runs ahead of {@link SessionAuthFilter}; every other
 * path passes through untouched.
 */
@Component
// One step behind SecurityHeadersFilter so rejected (429) responses still carry security headers.
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class AuthRateLimitFilter extends OncePerRequestFilter {

    static final String LOGIN_PATH = "/api/auth/login";
    static final String SIGNUP_PATH = "/api/auth/signup";

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final AuthRateLimiter limiter;
    private final boolean trustProxy;

    // Mirrors CorsConfig's allowlist so rejected responses are readable
    // cross-origin; without these, browsers hide even the 429 behind a
    // generic network error.
    @Value("${app.cors.origins}")
    private String corsOrigins = "";

    public AuthRateLimitFilter(AuthRateLimiter limiter,
            @Value("${app.trust-proxy:false}") boolean trustProxy) {
        this.limiter = limiter;
        this.trustProxy = trustProxy;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = requestPath(request);
        boolean login = "POST".equalsIgnoreCase(request.getMethod()) && LOGIN_PATH.equals(path);
        boolean signup = "POST".equalsIgnoreCase(request.getMethod()) && SIGNUP_PATH.equals(path);
        if (!login && !signup) {
            chain.doFilter(request, response);
            return;
        }

        String ip = resolveClientIp(request, trustProxy);
        Optional<Duration> wait;
        if (login) {
            // Buffer the body so it stays re-readable downstream; email is
            // best effort — an unreadable body still counts against the IP budget.
            byte[] body = readBody(request);
            wait = limiter.tryLogin(ip, readEmail(body));
            if (wait.isEmpty()) {
                chain.doFilter(new CachedBodyRequest(request, body), response);
                return;
            }
        } else {
            wait = limiter.trySignup(ip);
            if (wait.isEmpty()) {
                chain.doFilter(request, response);
                return;
            }
        }

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", String.valueOf(wait.get().toSeconds()));
        setCorsHeaders(request, response);
        MAPPER.writeValue(response.getWriter(), new ApiError("Too many attempts, please try again later"));
    }

    private void setCorsHeaders(HttpServletRequest request, HttpServletResponse response) {
        String origin = request.getHeader("Origin");
        if (origin == null) {
            return;
        }
        for (String allowed : corsOrigins.split(",")) {
            if (allowed.strip().equals(origin)) {
                response.setHeader("Access-Control-Allow-Origin", origin);
                response.setHeader("Vary", "Origin");
                response.setHeader("Access-Control-Allow-Credentials", "true");
                return;
            }
        }
    }

    static String requestPath(HttpServletRequest request) {
        String path = request.getServletPath();
        if (path == null || path.isEmpty()) {
            // Test harnesses (MockMvc) leave the servlet path empty.
            path = request.getRequestURI();
        }
        return path;
    }

    static String resolveClientIp(HttpServletRequest request, boolean trustProxy) {        if (trustProxy) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",", 2)[0].strip();
            }
        }
        return request.getRemoteAddr();
    }

    private static byte[] readBody(HttpServletRequest request) {
        try {
            return StreamUtils.copyToByteArray(request.getInputStream());
        } catch (IOException ex) {
            return new byte[0];
        }
    }

    private static String readEmail(byte[] body) {
        if (body.length == 0) {
            return null;
        }
        try {
            return MAPPER.readTree(body).path("email").asText(null);
        } catch (Exception ex) {
            return null;
        }
    }

    /** Serves a buffered body afresh on every read. */
    private static final class CachedBodyRequest extends HttpServletRequestWrapper {
        private final byte[] body;

        CachedBodyRequest(HttpServletRequest request, byte[] body) {
            super(request);
            this.body = body;
        }

        @Override
        public ServletInputStream getInputStream() {
            ByteArrayInputStream source = new ByteArrayInputStream(this.body);
            return new ServletInputStream() {
                @Override
                public boolean isFinished() {
                    return source.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener listener) {
                    // Blocking IO: listener unused.
                }

                @Override
                public int read() {
                    return source.read();
                }
            };
        }

        @Override
        public BufferedReader getReader() throws IOException {
            String encoding = getCharacterEncoding();
            InputStreamReader reader = encoding != null
                    ? new InputStreamReader(getInputStream(), encoding)
                    : new InputStreamReader(getInputStream());
            return new BufferedReader(reader);
        }
    }
}
