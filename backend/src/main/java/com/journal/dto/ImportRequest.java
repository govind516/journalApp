package com.journal.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ImportRequest {
    private String filename;
    private String format;
    private String contentBase64;
}
