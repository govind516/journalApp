package com.journal.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Static security headers for every {@code /api/*} response, in every
 * profile. Runs ahead of {@link AuthRateLimitFilter} so rejected (429)
 * responses carry the same headers. No HSTS here — that is TLS-only and
 * lives in the nginx layer (commented until TLS termination exists).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (AuthRateLimitFilter.requestPath(request).startsWith("/api/")) {
            response.setHeader("X-Content-Type-Options", "nosniff");
            response.setHeader("X-Frame-Options", "DENY");
            response.setHeader("Referrer-Policy", "no-referrer");
            response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
        }
        chain.doFilter(request, response);
    }

    /**
     * Echoes CORS headers for a request the filter chain is about to reject.
     * Spring's own CORS handling only runs for requests that reach the
     * dispatcher, so rejections written directly here would otherwise be
     * unreadable cross-origin (browsers hide them as generic network errors).
     * Only exact allowlist matches are echoed — never open reflection.
     */
    static void addCorsEcho(HttpServletRequest request, HttpServletResponse response, String allowedOriginsCsv) {
        String origin = request.getHeader("Origin");
        if (origin == null) {
            return;
        }
        for (String allowed : allowedOriginsCsv.split(",")) {
            if (allowed.strip().equals(origin)) {
                response.setHeader("Access-Control-Allow-Origin", origin);
                response.setHeader("Vary", "Origin");
                response.setHeader("Access-Control-Allow-Credentials", "true");
                return;
            }
        }
    }
}
