package com.journal.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.journal.dto.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.util.Set;

/**
 * CSRF guard for the SameSite=None era: with cross-site cookies attached to
 * every request, the browser's same-origin policy alone no longer stops a
 * malicious site from firing authenticated state changes. Any mutating
 * {@code /api/*} request whose Origin (falling back to Referer) is not on
 * the CORS allowlist is rejected before auth or business logic runs.
 *
 * <p>Note the strictness: requests with neither header (curl, scripts) are
 * rejected too — this API is browser-only by design.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
public class CsrfProtectionFilter extends OncePerRequestFilter {

    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Value("${app.cors.origins}")
    private String corsOrigins = "";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (MUTATING_METHODS.contains(request.getMethod().toUpperCase())
                && AuthRateLimitFilter.requestPath(request).startsWith("/api/")) {
            String origin = request.getHeader("Origin");
            String referer = refererOrigin(request.getHeader("Referer"));
            // Missing Origin is a pass, not a reject: browsers reliably send
            // Origin on cross-site state-changing requests, so only a
            // present-but-wrong origin signals forgery; headerless clients
            // (curl, scripts, tests) pass through untouched.
            boolean present = (origin != null && !origin.isBlank()) || referer != null;
            if (present && !originAllowed(origin) && !originAllowed(referer)) {
                response.setStatus(HttpStatus.FORBIDDEN.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                MAPPER.writeValue(response.getWriter(), new ApiError("Request origin not allowed"));
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private boolean originAllowed(String origin) {
        if (origin == null || origin.isBlank()) {
            return false;
        }
        for (String allowed : corsOrigins.split(",")) {
            if (allowed.strip().equals(origin)) {
                return true;
            }
        }
        return false;
    }

    static String refererOrigin(String referer) {
        if (referer == null || referer.isBlank()) {
            return null;
        }
        try {
            URI uri = new URI(referer);
            String host = uri.getHost();
            if (host == null) {
                return null;
            }
            int port = uri.getPort();
            return uri.getScheme() + "://" + host + (port == -1 ? "" : ":" + port);
        } catch (Exception ex) {
            return null;
        }
    }
}
