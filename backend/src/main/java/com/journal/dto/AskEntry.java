package com.journal.dto;

import lombok.Getter;

@Getter
public class AskEntry {
    private final String id;
    private final String date;
    private final String excerpt;
    private final String mood;

    public AskEntry(String id, String date, String excerpt, String mood) {
        this.id = id;
        this.date = date;
        this.excerpt = excerpt;
        this.mood = mood;
    }
}
