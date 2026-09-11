package com.journal.dto;

import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
public class InsightsResponse {
    private final int currentStreak;
    private final int longestStreak;
    private final int totalEntries;
    private final int writingDays;
    private final Map<String, Long> moodCounts;
    private final List<MoodPoint> moodPoints;
    private final List<TagCount> tagCounts;
    private final List<Badge> badges;

    public InsightsResponse(int currentStreak, int longestStreak, int totalEntries, int writingDays,
                             Map<String, Long> moodCounts, List<MoodPoint> moodPoints,
                             List<TagCount> tagCounts, List<Badge> badges) {
        this.currentStreak = currentStreak;
        this.longestStreak = longestStreak;
        this.totalEntries = totalEntries;
        this.writingDays = writingDays;
        this.moodCounts = moodCounts;
        this.moodPoints = moodPoints;
        this.tagCounts = tagCounts;
        this.badges = badges;
    }
}
