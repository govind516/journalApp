package com.journal.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SentryScrubberTest {

    @BeforeEach
    void setUp() {
    }

    @AfterEach
    void tearDown() {
    }

    @Test
    void shortContentRedacted() {
        String msg = SentryScrubber.scrubMessage("content=I relapsed today");
        assertTrue(msg.contains("content: *REDACTED"), msg);
        assertFalse(msg.contains("content=I relapsed today"));
    }

    @Test
    void shortTagRedacted() {
        String msg = SentryScrubber.scrubMessage("tags=grief");
        assertTrue(msg.contains("tags: *REDACTED"), msg);
        assertFalse(msg.contains("tags=grief"));
    }

    @Test
    void shortMoodRedacted() {
        String msg = SentryScrubber.scrubMessage("mood=sad");
        assertTrue(msg.contains("mood: *REDACTED"), msg);
        assertFalse(msg.contains("mood=sad"));
    }

    @Test
    void shortPinRedacted() {
        String msg = SentryScrubber.scrubMessage("pin=1234");
        assertTrue(msg.contains("pin: *REDACTED"), msg);
        assertFalse(msg.contains("pin=1234"));
    }

    @Test
    void secretInMessageRedacted() {
        String msg = SentryScrubber.scrubMessage("password=mysecretpassword123");
        assertTrue(msg.contains("password: *REDACTED"), msg);
        assertFalse(msg.contains("password=mysecretpassword123"));
    }

    @Test
    void longContentRedacted() {
        String longContent = " ".repeat(30);
        String msg = SentryScrubber.scrubMessage("content=" + longContent);
        assertTrue(msg.contains("content: *REDACTED"), msg);
        assertFalse(msg.contains("content=" + longContent), msg);
    }

    @Test
    void longNonSensitivePassesThrough() {
        String longUnstructured = " ".repeat(30);
        String msg = SentryScrubber.scrubMessage(longUnstructured);
        assertTrue(msg.contains(longUnstructured), msg);
        assertFalse(msg.contains("*REDACTED"), msg);
    }

    @Test
    void midLengthContentRedacted() {
        String midContent = " ".repeat(10);
        String msg = SentryScrubber.scrubMessage("content=" + midContent);
        assertTrue(msg.contains("content: *REDACTED"), msg);
        assertFalse(msg.contains("content=" + midContent), msg);
    }
}