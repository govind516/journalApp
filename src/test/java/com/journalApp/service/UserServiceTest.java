package com.journalApp.service;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
public class wUserServiceTest {

    @Autowired
    private UserService userService;

    @Test
    @Disabled
    public void testFindByUsername(){
        assertEquals(4,2+2);
        assertNotNull(userService.findByUserName("Ram"));
    }
}
