package com.journal.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class CalendarResponse {
    private final int year;
    private final List<CalendarDay> days;

    public CalendarResponse(int year, List<CalendarDay> days) {
        this.year = year;
        this.days = days;
    }
}
