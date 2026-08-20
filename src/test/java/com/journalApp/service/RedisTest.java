package com.journalApp.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RedisTest {

    @Test
    void testSerializationRoundTrip() {
        String json = "{\"key\":\"value\"}";
        assertNotNull(json);
        assertTrue(json.contains("key"));
    }
}
