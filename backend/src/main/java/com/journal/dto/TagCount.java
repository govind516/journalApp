package com.journal.dto;

import lombok.Getter;

@Getter
public class TagCount {
    private final String tag;
    private final long count;

    public TagCount(String tag, long count) {
        this.tag = tag;
        this.count = count;
    }
}
