package com.journalApp.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class JournalEntryDTO {

    @NotEmpty
    private String title;
    private String content;
    private LocalDateTime date;
}
