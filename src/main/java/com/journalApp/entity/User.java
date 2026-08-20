package com.journalApp.entity;

import jakarta.validation.constraints.NotEmpty;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "users")
public class User {

    @Id
    private ObjectId id;

    @NotEmpty
    @Indexed(unique = true)
    private String userName;

    private String email;

    private boolean sentimentAnalysis;

    @NotEmpty
    private String password;

    private List<String> roles;

    public User() {
    }

    public User(ObjectId id, String userName, String email, boolean sentimentAnalysis, String password, List<String> roles) {
        this.id = id;
        this.userName = userName;
        this.email = email;
        this.sentimentAnalysis = sentimentAnalysis;
        this.password = password;
        this.roles = roles != null ? roles : new ArrayList<>();
    }

    public ObjectId getId() {
        return id;
    }

    public void setId(ObjectId id) {
        this.id = id;
    }

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

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles != null ? roles : new ArrayList<>();
    }
}
