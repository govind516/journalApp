package com.journal.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Default profile ignores X-Forwarded-For: rotating the header does not buy
 * extra budget — every request still counts against the connection IP.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS) // limiter buckets live in this context
class AuthRateLimitUntrustedProxyTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void rotatingForwardedHeaderDoesNotEvadeLimit() throws Exception {
        for (int i = 0; i < 10; i++) {
            mvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-Forwarded-For", "10.20.30." + i)
                            .content("{\"email\":\"rl-untrusted-" + i + "@example.com\",\"password\":\"wrongpassword\"}"))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Forwarded-For", "10.20.30.99")
                        .content("{\"email\":\"rl-untrusted-10@example.com\",\"password\":\"wrongpassword\"}"))
                .andExpect(status().isTooManyRequests());
    }
}
