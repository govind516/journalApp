package com.journal.service;

import com.journal.dto.EntryWrite;
import com.journal.dto.ImportResponse;
import com.journal.exception.ApiException;
import com.journal.model.User;
import com.journal.repository.EntryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Synchronous, on-demand imports. Parsing and inserting happen inside the
 * request thread — no background jobs, no scheduled work, no idle cost.
 */
@Service
public class ImportService {

    static final long MAX_BYTES = 5L * 1024 * 1024;
    static final int MAX_ENTRIES = 2000;
    static final Set<String> FORMATS = Set.of("markdown", "md", "json", "csv", "dayone");

    private final EntryRepository entryRepository;
    private final EntryService entryService;

    public ImportService(EntryRepository entryRepository, EntryService entryService) {
        this.entryRepository = entryRepository;
        this.entryService = entryService;
    }

    public ImportResponse importFile(User user, String format, byte[] bytes) {
        if (format == null || !FORMATS.contains(format.strip().toLowerCase(java.util.Locale.ROOT))) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "Choose markdown, json, csv or dayone");
        }
        if (bytes == null || bytes.length == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "The file is empty");
        }
        if (bytes.length > MAX_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE.value(), "Files up to 5 MB can be imported");
        }
        String text = new String(bytes, StandardCharsets.UTF_8);
        EntryImportParser.ParsedFile parsed;
        try {
            parsed = EntryImportParser.parse(format.strip(), text);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), ex.getMessage());
        }

        List<String> errors = new ArrayList<>(parsed.errors());
        List<EntryImportParser.ParsedEntry> entries = parsed.entries();
        if (entries.size() > MAX_ENTRIES) {
            errors.add("Only the first " + MAX_ENTRIES + " entries were imported");
            entries = entries.subList(0, MAX_ENTRIES);
        }

        int imported = 0;
        int skipped = 0;
        for (EntryImportParser.ParsedEntry draft : entries) {
            boolean exists = entryRepository.findByUserIdAndDate(user.getId(), draft.date())
                    .map(existing -> existing.getContent() != null && !existing.getContent().isBlank())
                    .orElse(false);
            if (exists) {
                skipped++;
                continue;
            }
            EntryWrite payload = new EntryWrite();
            payload.setDate(draft.date());
            payload.setContent(draft.content() == null ? "" : draft.content());
            payload.setMood(draft.mood());
            payload.setTags(draft.tags() == null ? List.of() : draft.tags());
            payload.setBackfilled(true);
            entryService.saveByDate(user, draft.date(), payload);
            imported++;
        }
        return new ImportResponse(imported, skipped, errors.stream().limit(20).toList());
    }
}
