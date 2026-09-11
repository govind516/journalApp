package com.journal.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class ImportResponse {
    private final int imported;
    private final int skipped;
    private final List<String> errors;

    public ImportResponse(int imported, int skipped, List<String> errors) {
        this.imported = imported;
        this.skipped = skipped;
        this.errors = errors;
    }
}
