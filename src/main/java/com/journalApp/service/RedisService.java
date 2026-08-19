package com.journalApp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class RedisService {

    private static final Logger log = LoggerFactory.getLogger(RedisService.class);

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    public <T> T get(String key, Class<T> entityClass) {
        try {
            String jsonValue = redisTemplate.opsForValue().get(key);
            if (jsonValue == null) {
                return null;
            }
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(jsonValue, entityClass);
        } catch (Exception e) {
            log.error("Exception: ", e);
            return null;
        }
    }

    public void set(String key, Object object, Long ttl) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            String jsonValue = mapper.writeValueAsString(object);
            redisTemplate.opsForValue().set(key, jsonValue, ttl, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("Exception: ", e);
        }
    }
}