package com.journal.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "entries",
    uniqueConstraints = @UniqueConstraint(name = "user_date_unique", columnNames = {"user_id", "entry_date"}),
    indexes = @Index(name = "user_date_idx", columnList = "user_id, entry_date")
)
@Getter
@Setter
public class Entry {

    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "entry_date", nullable = false)
    private String date; // YYYY-MM-DD

    @Column(columnDefinition = "text")
    private String content = "";

    private String mood;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "entry_tags", joinColumns = @JoinColumn(name = "entry_id"))
    @Column(name = "tag")
    @OrderColumn(name = "tag_order")
    private List<String> tags = new ArrayList<>();

    private boolean backfilled = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public String getContent() {
        return content;
    }

    public String getMood() {
        return mood;
    }

    public String getDate() {
        return date;
    }

    public List<String> getTags() {
        return tags;
    }

    public String getId() {
        return id;
    }
}
