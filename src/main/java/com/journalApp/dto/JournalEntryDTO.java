package com.journalApp.dto;

import jakarta.validation.constraints.NotEmpty;

import java.time.LocalDateTime;

public class JournalEntryDTO {

    private static final java.util.logging.Logger log = java.util.logging.Logger.getLogger(JournalEntryDTO.class.getName());

    public JournalEntryDTO() {
    }

    public JournalEntryDTO(String title, String content, LocalDateTime date) {
        this.title = title;
        this.content = content;
        this.date = date;
    }

    @NotEmpty
    private String title;

    private String content;

    private LocalDateTime date;

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
}