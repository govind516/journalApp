package com.journal.dto;

import lombok.Getter;

@Getter
public class ApiError {
    private final String detail;

    public ApiError(String detail) {
        this.detail = detail;
    }
}
