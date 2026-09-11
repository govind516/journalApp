package com.journal.dto;

import lombok.Getter;

@Getter
public class MoodPoint {
    private final String date;
    private final String mood;

    public MoodPoint(String date, String mood) {
        this.date = date;
        this.mood = mood;
    }
}
