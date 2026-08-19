package com.journalApp.model;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

public class SentimentData {

    private static final Logger log = LoggerFactory.getLogger(SentimentData.class);

    private String email;
    private String sentiment;

    public SentimentData() {
    }

    public SentimentData(String email, String sentiment) {
        this.email = email;
        this.sentiment = sentiment;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getSentiment() {
        return sentiment;
    }

    public void setSentiment(String sentiment) {
        this.sentiment = sentiment;
    }
}