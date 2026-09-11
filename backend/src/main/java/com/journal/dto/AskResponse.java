package com.journal.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class AskResponse {
    private final String answer;
    private final List<AskEntry> entries;
    private final String source;

    public AskResponse(String answer, List<AskEntry> entries, String source) {
        this.answer = answer;
        this.entries = entries;
        this.source = source;
    }
}
