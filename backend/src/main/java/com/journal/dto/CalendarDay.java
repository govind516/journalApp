package com.journal.dto;

import lombok.Getter;

@Getter
public class CalendarDay {
    private final String date;
    private final int words;
    private final String entryId;

    public CalendarDay(String date, int words, String entryId) {
        this.date = date;
        this.words = words;
        this.entryId = entryId;
    }
}
