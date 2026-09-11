package com.journal.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The generated spec must mirror the real auth contract (shapes and the
 * documented 401/409/429 responses), and the Swagger UI must resolve.
 */
@SpringBootTest
@AutoConfigureMockMvc
class OpenApiSpecTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void loginShapeMatchesReality() throws Exception {
        mvc.perform(get("/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/auth/login'].post.requestBody.content['application/json'].schema.$ref")
                        .value("#/components/schemas/LoginRequest"))
                .andExpect(jsonPath("$.components.schemas.LoginRequest.properties.email.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.LoginRequest.properties.password.type").value("string"))
                .andExpect(jsonPath("$.paths['/api/auth/login'].post.responses['401'].description")
                        .value("Email or password not recognised"))
                .andExpect(jsonPath("$.paths['/api/auth/login'].post.responses['429']").exists());
    }

    @Test
    void signupDocumentsConflict() throws Exception {
        mvc.perform(get("/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/auth/signup'].post.responses['409'].description")
                        .value("Email already registered"))
                .andExpect(jsonPath("$.paths['/api/auth/signup'].post.responses['429']").exists());
    }

    @Test
    void swaggerUiResolves() throws Exception {
        mvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
    }
}
