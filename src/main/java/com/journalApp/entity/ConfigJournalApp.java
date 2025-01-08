package com.journalApp.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "journalConfig")
public class ConfigJournalApp {

    private String key;
    private String value;
}
