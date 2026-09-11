package com.journal.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Thin Brevo SMTP-API client over the JDK HTTP client. No SDK, no pool —
 * one short-lived call per nudge, 10s timeouts, failures as exceptions.
 */
@Component
public class BrevoClient {

    private static final Logger log = LoggerFactory.getLogger(BrevoClient.class);
    private static final String ENDPOINT = "https://api.brevo.com/v3/smtp/email";

    private final String apiKey;
    private final String sender;
    private final HttpClient http;

    public BrevoClient(
            @Value("${BREVO_API_KEY:}") String apiKey,
            @Value("${BREVO_SENDER:journal@localhost}") String sender) {
        this.apiKey = apiKey == null ? "" : apiKey.strip();
        this.sender = sender;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    public boolean configured() {
        return !apiKey.isEmpty();
    }

    public void send(String to, String subject, String text) throws Exception {
        String body = "{\"sender\":{\"email\":\"" + json(sender) + "\",\"name\":\"journal.\"},"
                + "\"to\":[{\"email\":\"" + json(to) + "\"}],"
                + "\"subject\":\"" + json(subject) + "\","
                + "\"textContent\":\"" + json(text) + "\"}";
        HttpRequest request = HttpRequest.newBuilder(URI.create(ENDPOINT))
                .timeout(Duration.ofSeconds(10))
                .header("api-key", apiKey)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 201) {
            throw new IllegalStateException("Brevo rejected the send: HTTP " + response.statusCode());
        }
        log.info("Reminder sent");
    }

    private static String json(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
    }
}
