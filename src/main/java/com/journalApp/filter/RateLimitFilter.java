package com.journalApp.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitFilter implements Filter {

    private static final int MAX_ATTEMPTS = 10;
    private static final long WINDOW_MS = 60_000;

    private final Map<String, AttemptInfo> attempts = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpReq = (HttpServletRequest) request;
        HttpServletResponse httpResp = (HttpServletResponse) response;

        if ("/public/login".equals(httpReq.getRequestURI()) && "POST".equalsIgnoreCase(httpReq.getMethod())) {
            String clientIp = getClientIp(httpReq);

            AttemptInfo info = attempts.compute(clientIp, (k, v) -> {
                if (v == null || System.currentTimeMillis() - v.windowStart > WINDOW_MS) {
                    return new AttemptInfo();
                }
                return v;
            });

            if (info.count.incrementAndGet() > MAX_ATTEMPTS) {
                httpResp.setStatus(429);
                httpResp.setContentType("application/json");
                httpResp.getWriter().write("{\"error\":\"Too many login attempts. Please try again in 1 minute.\"}");
                return;
            }
        }

        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isEmpty()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static class AttemptInfo {
        final AtomicInteger count = new AtomicInteger(0);
        final long windowStart = System.currentTimeMillis();
    }
}
