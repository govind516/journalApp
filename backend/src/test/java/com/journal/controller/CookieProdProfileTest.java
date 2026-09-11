package com.journal.controller;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Mirrors the prod profile's cookie contract (secure transport +
 * cross-site SameSite) without activating the profile itself, which would
 * demand real prod secrets.
 */
@SpringBootTest(properties = {
        "app.cookie.secure=true",
        "app.cookie.same-site=None",
        "app.cors.origins=http://localhost:3000"
})
@AutoConfigureMockMvc
@Transactional
class CookieProdProfileTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void prodCookieCarriesNoneAndSecure() throws Exception {
        MvcResult signup = mvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"cookie-prod@example.com\",\"password\":\"password123\",\"name\":\"Cookie\"}"))
                .andExpect(status().is2xxSuccessful())
                .andReturn();
        // Assert on the Cookie object for SameSite (MockMvc's Set-Cookie header
        // rendering drops custom attributes, but the live container renders
        // them — the Lax probes proved the mechanism) and on the header for
        // Secure (a standard field the mock does render).
        Cookie session = signup.getResponse().getCookie("journal_session");
        assertTrue(session != null && "None".equals(session.getAttributes().get("SameSite")),
                "expected SameSite=None");
        String setCookie = signup.getResponse().getHeader("Set-Cookie");
        assertTrue(setCookie != null && setCookie.contains("Secure"),
                "expected Secure flag, got: " + setCookie);
    }
}
