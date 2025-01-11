package com.journalApp.entity;

import com.journalApp.enums.Sentiment;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Document(collection = "journalEntries")
public class JournalEntry {

    @Id
    private ObjectId id;
    @NotEmpty
    private String title;
    private String content;
    private LocalDateTime date;
    private Sentiment sentiment;
}
