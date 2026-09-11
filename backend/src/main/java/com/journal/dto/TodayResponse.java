package com.journal.dto;

import lombok.Getter;

@Getter
public class TodayResponse {
    private final String date;
    private final EntryResponse entry;

    public TodayResponse(String date, EntryResponse entry) {
        this.date = date;
        this.entry = entry;
    }
}
