package com.journalApp.controller;

import com.journalApp.service.GoogleAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/auth/google")
@Tag(name = "5. Google OAuth2 APIs")
public class GoogleAuthController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GoogleAuthController.class);

    @Autowired
    private GoogleAuthService googleAuthService;

    @GetMapping("/callback")
    @Operation(summary = "Google Login using OAuth2.0")
    public ResponseEntity<Map<String, String>> handleGoogleCallback(@RequestParam String code) {
        try {
            return googleAuthService.processGoogleCallback(code);
        } catch (Exception e) {
            log.error("Exception occurred while processing Google callback", e);
            return ResponseEntity.status(500).build();
        }
    }
}