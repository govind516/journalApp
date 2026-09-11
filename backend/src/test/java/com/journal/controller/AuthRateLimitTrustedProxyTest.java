package com.journal.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Trusted-proxy profile ({@code app.trust-proxy=true}): the first
 * X-Forwarded-For address is the client, so per-IP and per-email budgets
 * apply independently.
 */
@SpringBootTest(properties = "app.trust-proxy=true")
@AutoConfigureMockMvc
@Transactional
class AuthRateLimitTrustedProxyTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void sameEmailAcrossIpsHitsEmailBudget() throws Exception {
        for (int i = 0; i < 10; i++) {
            mvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-Forwarded-For", "10.31.0." + i)
                            .content("{\"email\":\"rl-trusted-email@example.com\",\"password\":\"wrongpassword\"}"))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Forwarded-For", "10.31.0.99")
                        .content("{\"email\":\"rl-trusted-email@example.com\",\"password\":\"wrongpassword\"}"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void distinctIpsAndEmailsAreUnaffected() throws Exception {
        for (int i = 0; i < 10; i++) {
            mvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-Forwarded-For", "10.32.0." + i)
                            .content("{\"email\":\"rl-trusted-fresh-" + i + "@example.com\",\"password\":\"wrongpassword\"}"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void sameIpAcrossEmailsHitsIpBudget() throws Exception {
        for (int i = 0; i < 10; i++) {
            mvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("Origin", "http://localhost:5173")
                            .header("X-Forwarded-For", "10.33.0.7")
                            .content("{\"email\":\"rl-trusted-ip-" + i + "@example.com\",\"password\":\"wrongpassword\"}"))
                    .andExpect(status().isUnauthorized());
        }
        // Allowed origins see the rejection; anything else gets no CORS echo.
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Origin", "http://localhost:5173")
                        .header("X-Forwarded-For", "10.33.0.7")
                        .content("{\"email\":\"rl-trusted-ip-10@example.com\",\"password\":\"wrongpassword\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Origin", "http://evil.example.com")
                        .header("X-Forwarded-For", "10.33.0.7")
                        .content("{\"email\":\"rl-trusted-ip-11@example.com\",\"password\":\"wrongpassword\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
