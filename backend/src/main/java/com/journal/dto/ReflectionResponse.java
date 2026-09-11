package com.journal.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class ReflectionResponse {
    private final String month;
    private final String title;
    private final int entries;
    private final int writingDays;
    private final String topMood;
    private final List<TagCount> topTags;
    private final String longestEntryId;
    private final String longestEntryDate;
    private final int longestWords;
    private final String narrative;

    public ReflectionResponse(String month, String title, int entries, int writingDays,
                              String topMood, List<TagCount> topTags,
                              String longestEntryId, String longestEntryDate, int longestWords,
                              String narrative) {
        this.month = month;
        this.title = title;
        this.entries = entries;
        this.writingDays = writingDays;
        this.topMood = topMood;
        this.topTags = topTags;
        this.longestEntryId = longestEntryId;
        this.longestEntryDate = longestEntryDate;
        this.longestWords = longestWords;
        this.narrative = narrative;
    }
}
