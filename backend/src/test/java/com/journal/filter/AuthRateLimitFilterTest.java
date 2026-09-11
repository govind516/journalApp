package com.journal.filter;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AuthRateLimitFilterTest {

    private static MockHttpServletRequest request(String remoteAddr, String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddr);
        if (forwardedFor != null) {
            request.addHeader("X-Forwarded-For", forwardedFor);
        }
        return request;
    }

    @Test
    void usesRemoteAddrWithoutProxyTrust() {
        assertEquals("9.9.9.9",
                AuthRateLimitFilter.resolveClientIp(request("9.9.9.9", "1.2.3.4"), false));
    }

    @Test
    void usesFirstForwardedAddressWhenTrusted() {
        assertEquals("1.2.3.4",
                AuthRateLimitFilter.resolveClientIp(request("9.9.9.9", "1.2.3.4"), true));
        assertEquals("1.2.3.4",
                AuthRateLimitFilter.resolveClientIp(request("9.9.9.9", " 1.2.3.4 , 5.6.7.8"), true));
    }

    @Test
    void fallsBackToRemoteAddrOnBlankHeader() {
        assertEquals("9.9.9.9", AuthRateLimitFilter.resolveClientIp(request("9.9.9.9", "   "), true));
        assertEquals("9.9.9.9", AuthRateLimitFilter.resolveClientIp(request("9.9.9.9", null), true));
    }

    @Test
    void prefersServletPathFallsBackToRequestUri() {
        MockHttpServletRequest withServletPath = new MockHttpServletRequest();
        withServletPath.setServletPath("/api/auth/login");
        withServletPath.setRequestURI("/api/auth/login");
        assertEquals("/api/auth/login", AuthRateLimitFilter.requestPath(withServletPath));

        MockHttpServletRequest uriOnly = new MockHttpServletRequest();
        uriOnly.setRequestURI("/api/auth/signup");
        assertEquals("/api/auth/signup", AuthRateLimitFilter.requestPath(uriOnly));
    }
}
