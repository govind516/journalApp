package com.journal.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class MemoryResponse {
    private final List<MemorySignal> signals;

    public MemoryResponse(List<MemorySignal> signals) {
        this.signals = signals;
    }
}
