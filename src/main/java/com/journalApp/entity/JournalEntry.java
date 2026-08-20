package com.journalApp.entity;

import com.journalApp.enums.Sentiment;
import jakarta.validation.constraints.NotEmpty;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "journalEntries")
public class JournalEntry {

    @Id
    private ObjectId id;

    @NotEmpty
    private String title;

    private String content;

    private LocalDateTime date;

    private Sentiment sentiment;

    @Indexed
    private String userName;

    public JournalEntry() {
    }

    public JournalEntry(ObjectId id, String title, String content, LocalDateTime date, Sentiment sentiment, String userName) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.date = date;
        this.sentiment = sentiment;
        this.userName = userName;
    }

    public ObjectId getId() {
        return id;
    }

    public void setId(ObjectId id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getDate() {
        return date;
    }

    public void setDate(LocalDateTime date) {
        this.date = date;
    }

    public Sentiment getSentiment() {
        return sentiment;
    }

    public void setSentiment(Sentiment sentiment) {
        this.sentiment = sentiment;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }
}
