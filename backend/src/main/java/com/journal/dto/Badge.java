package com.journal.dto;

import lombok.Getter;

@Getter
public class Badge {
    private final String name;
    private final String description;
    private final boolean unlocked;

    public Badge(String name, String description, boolean unlocked) {
        this.name = name;
        this.description = description;
        this.unlocked = unlocked;
    }
}
