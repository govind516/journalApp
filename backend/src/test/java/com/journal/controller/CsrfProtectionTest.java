package com.journal.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * SameSite=None removed the browser's implicit CSRF protection, so mutating
 * endpoints enforce the CORS allowlist explicitly. Safe methods pass through.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS) // limiter buckets live in this context
class CsrfProtectionTest {

    private static final String ALLOWED = "http://localhost:5173";

    @Autowired
    private MockMvc mvc;

    private static String loginJson(String email) {
        return "{\"email\":\"" + email + "\",\"password\":\"wrongpassword\"}";
    }

    @Test
    void allowedOriginPasses() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Origin", ALLOWED)
                        .content(loginJson("csrf-ok@example.com")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void mismatchedOriginRejected() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Origin", "http://evil.example.com")
                        .content(loginJson("csrf-evil@example.com")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Request origin not allowed"))
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void missingOriginPasses() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("csrf-absent@example.com")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void safeMethodsUnaffected() throws Exception {
        mvc.perform(get("/api/insights")).andExpect(status().isUnauthorized());
    }
}
