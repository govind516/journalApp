package com.journal.dto;

import com.journal.model.Entry;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
public class EntryResponse {
    private final String id;
    private final String date;
    private final String content;
    private final String mood;
    private final List<String> tags;
    private final boolean backfilled;
    private final Instant createdAt;
    private final Instant updatedAt;

    public EntryResponse(Entry entry) {
        this.id = entry.getId();
        this.date = entry.getDate();
        this.content = entry.getContent();
        this.mood = entry.getMood();
        this.tags = entry.getTags();
        this.backfilled = entry.isBackfilled();
        this.createdAt = entry.getCreatedAt();
        this.updatedAt = entry.getUpdatedAt();
    }
}
