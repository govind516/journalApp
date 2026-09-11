package com.journal.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * No-such-user and wrong-password logins must be indistinguishable over HTTP:
 * identical status and identical body.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS) // limiter buckets live in this context
class AuthErrorParityTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void missingUserAndWrongPasswordAreIdentical() throws Exception {
        mvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"parity-user@example.com\",\"password\":\"password123\",\"name\":\"Parity\"}"))
                .andExpect(status().is2xxSuccessful());

        MvcResult missing = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"parity-ghost@example.com\",\"password\":\"candidate123\"}"))
                .andExpect(status().isUnauthorized())
                .andReturn();

        MvcResult wrong = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"parity-user@example.com\",\"password\":\"candidate123\"}"))
                .andExpect(status().isUnauthorized())
                .andReturn();

        assertEquals(missing.getResponse().getStatus(), wrong.getResponse().getStatus());
        assertEquals(missing.getResponse().getContentAsString(), wrong.getResponse().getContentAsString());
    }
}
