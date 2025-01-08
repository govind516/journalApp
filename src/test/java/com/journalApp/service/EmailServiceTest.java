package com.journalApp.service;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class EmailServiceTest {

    @Autowired
    private EmailService emailService;

    @Test
    @Disabled
    void testSendEmail(){
        emailService.sendMail("guptagovind516@gmail.com","Testing Java Mail Sender","Hello, Aap kese hai ?");
    }
}
