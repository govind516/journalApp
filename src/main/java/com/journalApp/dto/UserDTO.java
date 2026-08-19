package com.journalApp.dto;

import jakarta.validation.constraints.NotEmpty;
import org.springframework.data.mongodb.core.index.Indexed;

public class UserDTO {

    private static final java.util.logging.Logger log = java.util.logging.Logger.getLogger(UserDTO.class.getName());

    public UserDTO() {
    }

    public UserDTO(String userName, String email, boolean sentimentAnalysis, String password) {
        this.userName = userName;
        this.email = email;
        this.sentimentAnalysis = sentimentAnalysis;
        this.password = password;
    }

    @NotEmpty
    @Indexed(unique = true)
    private String userName;

    private String email;

    private boolean sentimentAnalysis;

    @NotEmpty
    private String password;

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean isSentimentAnalysis() {
        return sentimentAnalysis;
    }

    public void setSentimentAnalysis(boolean sentimentAnalysis) {
        this.sentimentAnalysis = sentimentAnalysis;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}