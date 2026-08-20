package com.journalApp.dto;

import com.journalApp.enums.Sentiment;

import java.time.LocalDateTime;

public class JournalEntryDTO {

    private String title;
    private String content;
    private LocalDateTime date;
    private Sentiment sentiment;

    public JournalEntryDTO() {
    }

    public JournalEntryDTO(String title, String content, LocalDateTime date, Sentiment sentiment) {
        this.title = title;
        this.content = content;
        this.date = date;
        this.sentiment = sentiment;
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
}
