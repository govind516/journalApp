package com.journalApp.controller;

import com.journalApp.service.GoogleAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/auth/google")
@Tag(name = "5. Google OAuth2 APIs")
public class GoogleAuthController {

    @Autowired
    private GoogleAuthService googleAuthService;

    @GetMapping("/callback")
    @Operation(summary = "Google Login using OAuth2.0")
    public ResponseEntity<Map<String, String>> handleGoogleCallback(@RequestParam String code) {
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Collections.singletonMap("error", "Authorization code is required"));
        }
        return googleAuthService.processGoogleCallback(code);
    }
}
