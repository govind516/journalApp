package com.journal.controller;

import com.journal.dto.EntryResponse;
import com.journal.model.Entry;
import com.journal.model.User;
import com.journal.service.EntryService;
import com.journal.util.CurrentUserHolder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final EntryService entryService;

    public ExportController(EntryService entryService) {
        this.entryService = entryService;
    }

    @GetMapping(value = "/markdown", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> exportMarkdown() {
        User user = CurrentUserHolder.requireUser();
        List<Entry> entries = entryService.allForUser(user);

        StringBuilder sb = new StringBuilder();
        sb.append("# ").append(user.getName()).append("'s Journal\n\n");
        for (Entry entry : entries) {
            if (entry.getContent() == null || entry.getContent().isBlank()) continue;
            sb.append("## ").append(entry.getDate()).append("\n\n");
            if (entry.getMood() != null) sb.append("Mood: ").append(entry.getMood()).append("\n");
            if (!entry.getTags().isEmpty()) {
                sb.append("Tags: ");
                sb.append(String.join(", ", entry.getTags().stream().map(t -> "#" + t).toList()));
                sb.append("\n");
            }
            sb.append("\n").append(entry.getContent().strip()).append("\n\n");
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"my-journal.md\"")
                .body(sb.toString());
    }

    @GetMapping(value = "/json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<EntryResponse>> exportJson() {
        User user = CurrentUserHolder.requireUser();
        List<EntryResponse> entries = entryService.allForUser(user).stream()
                .map(EntryResponse::new)
                .toList();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"my-journal.json\"")
                .body(entries);
    }
}
