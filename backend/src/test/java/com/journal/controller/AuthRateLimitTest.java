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
 * Default (untrusted-proxy) profile: budgets apply per client IP, the
 * X-Forwarded-For header is ignored, and unrelated paths pass through.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS) // limiter buckets live in this context
class AuthRateLimitTest {

    @Autowired
    private MockMvc mvc;

    private static String loginJson(String email) {
        return "{\"email\":\"" + email + "\",\"password\":\"wrongpassword\"}";
    }

    @Test
    void eleventhLoginInAMinuteIsRejected() throws Exception {
        for (int i = 0; i < 10; i++) {
            mvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginJson("rl-login-" + i + "@example.com")))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("rl-login-10@example.com")))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.detail").value("Too many attempts, please try again later"));
    }

    @Test
    void eleventhSignupInAnHourIsRejected() throws Exception {
        for (int i = 0; i < 10; i++) {
            mvc.perform(post("/api/auth/signup")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"rl-signup-" + i + "@example.com\",\"password\":\"password123\",\"name\":\"Rl\"}"))
                    .andExpect(status().is2xxSuccessful());
        }
        mvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"rl-signup-10@example.com\",\"password\":\"password123\",\"name\":\"Rl\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.detail").value("Too many attempts, please try again later"));
    }

    @Test
    void unrelatedPathsAreUnaffected() throws Exception {
        mvc.perform(get("/api/insights")).andExpect(status().isUnauthorized());
    }
}
