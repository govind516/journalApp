package com.journal.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class MemorySignal {
    private final String kind;
    private final String title;
    private final String detail;
    private final List<String> entryIds;

    public MemorySignal(String kind, String title, String detail, List<String> entryIds) {
        this.kind = kind;
        this.title = title;
        this.detail = detail;
        this.entryIds = entryIds;
    }
}
