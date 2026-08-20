package com.journalApp.service;

import com.journalApp.entity.User;
import com.journalApp.repository.UserRepository;
import com.journalApp.utils.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class GoogleAuthService {

    private static final Logger log = LoggerFactory.getLogger(GoogleAuthService.class);

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String clientId;

    @Value("${spring.security.oauth2.client.registration.google.client-secret}")
    private String clientSecret;

    @Value("${google.redirect-uri}")
    private String redirectUri;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    public ResponseEntity<Map<String, String>> processGoogleCallback(String code) {
        try {
            String idToken = exchangeCodeForIdToken(code);
            if (idToken == null) {
                log.error("Failed to obtain id_token from Google");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Collections.singletonMap("error", "Failed to authenticate with Google"));
            }

            String email = getEmailFromIdToken(idToken);
            if (email == null) {
                log.error("Failed to extract email from Google id_token");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Collections.singletonMap("error", "Could not retrieve email from Google"));
            }

            createOrUpdateGoogleUser(email);

            String jwtToken = jwtUtil.generateToken(email);
            return ResponseEntity.ok(Collections.singletonMap("token", jwtToken));

        } catch (Exception e) {
            log.error("Error during Google authentication", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Google authentication failed: " + e.getMessage()));
        }
    }

    private String exchangeCodeForIdToken(String code) {
        String tokenEndpoint = "https://oauth2.googleapis.com/token";

        LinkedMultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("code", code);
        params.add("client_id", clientId);
        params.add("client_secret", clientSecret);
        params.add("redirect_uri", redirectUri);
        params.add("grant_type", "authorization_code");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        HttpEntity<LinkedMultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<Map> tokenResponse = restTemplate.postForEntity(tokenEndpoint, request, Map.class);
            if (tokenResponse.getBody() == null || !tokenResponse.getBody().containsKey("id_token")) {
                log.error("Google token response missing id_token: {}", tokenResponse.getBody());
                return null;
            }
            return (String) tokenResponse.getBody().get("id_token");
        } catch (Exception e) {
            log.error("Failed to exchange authorization code for id_token", e);
            return null;
        }
    }

    private String getEmailFromIdToken(String idToken) {
        String userInfoUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
        try {
            ResponseEntity<Map> userInfoResponse = restTemplate.getForEntity(userInfoUrl, Map.class);
            if (userInfoResponse.getStatusCode() == HttpStatus.OK && userInfoResponse.getBody() != null) {
                return (String) userInfoResponse.getBody().get("email");
            }
        } catch (Exception e) {
            log.error("Failed to get user info from Google tokeninfo", e);
        }
        return null;
    }

    private void createOrUpdateGoogleUser(String email) {
        userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setUserName(email);
            newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            newUser.setRoles(List.of("USER"));
            userRepository.save(newUser);
            return newUser;
        });
    }
}
