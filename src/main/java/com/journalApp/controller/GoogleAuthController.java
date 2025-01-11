package com.journalApp.controller;

import com.journalApp.service.GoogleAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
@RequestMapping("/auth/google")
@Slf4j
@Tag(name = "5. Google OAuth2 APIs")
public class GoogleAuthController {

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

/*

https://accounts.google.com/o/oauth2/auth?
client_id=YOUR_CLIENT_ID
    &redirect_uri=YOUR_REDIRECT_URI
    &response_type=code
    &scope=email profile
    &access_type=offline
    &prompt=consent

*/