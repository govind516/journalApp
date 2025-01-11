package com.journalApp.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.RedisTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
class RedisTest {

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    @Test
    void testRedis(){
        redisTemplate.opsForValue().set("email","email@gamil.com");
        redisTemplate.opsForValue().set("salary", "10k");

        assertEquals("email@gamil.com", redisTemplate.opsForValue().get("email"));
        assertEquals("10k", redisTemplate.opsForValue().get("salary"));
    }
}
