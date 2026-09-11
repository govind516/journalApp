package com.journal.service;

import com.journal.dto.*;
import com.journal.exception.ApiException;
import com.journal.model.Entry;
import com.journal.model.User;
import com.journal.repository.EntryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class EntryService {

    /** The only feelings the product understands. Null/blank means "unnamed". */
    public static final java.util.Set<String> ALLOWED_MOODS =
            java.util.Set.of("calm", "pensive", "inspired", "restless", "grateful");

    public static boolean isKnownMood(String mood) {
        return mood == null || mood.isBlank() || ALLOWED_MOODS.contains(mood.strip().toLowerCase(java.util.Locale.ROOT));
    }

    private static String normalizeMood(String mood) {
        if (mood == null || mood.isBlank()) return null;
        return mood.strip().toLowerCase(java.util.Locale.ROOT);
    }

    private final EntryRepository entryRepository;

    public EntryService(EntryRepository entryRepository) {
        this.entryRepository = entryRepository;
    }

    public String todayIso(String timezone) {
        ZoneId zone;
        try {
            zone = ZoneId.of(timezone == null || timezone.isBlank() ? "UTC" : timezone);
        } catch (Exception ex) {
            zone = ZoneId.of("UTC");
        }
        return LocalDate.now(zone).toString();
    }

    public TodayResponse today(User user) {
        String date = todayIso(user.getTimezone());
        Entry entry = entryRepository.findByUserIdAndDate(user.getId(), date).orElse(null);
        return new TodayResponse(date, entry == null ? null : new EntryResponse(entry));
    }

    @Transactional(readOnly = true)
    public EntryResponse byDate(User user, String date) {
        return entryRepository.findByUserIdAndDate(user.getId(), date)
                .map(EntryResponse::new)
                .orElse(null);
    }

    public EntryResponse saveByDate(User user, String urlDate, EntryWrite payload) {
        if (!urlDate.equals(payload.getDate())) {
            throw new ApiException(400, "Entry date does not match the URL");
        }
        try {
            LocalDate.parse(urlDate);
        } catch (DateTimeParseException ex) {
            throw new ApiException(422, "Use a valid YYYY-MM-DD date");
        }
        if (!isKnownMood(payload.getMood())) {
            throw new ApiException(400, "Unknown feeling — choose calm, pensive, inspired, restless or grateful, or leave it unnamed");
        }

        Entry entry = entryRepository.findByUserIdAndDate(user.getId(), urlDate).orElse(null);
        Instant now = Instant.now();
        if (entry == null) {
            entry = new Entry();
            entry.setId(UUID.randomUUID().toString());
            entry.setUserId(user.getId());
            entry.setDate(urlDate);
            entry.setCreatedAt(now);
        }
        entry.setContent(payload.getContent() == null ? "" : payload.getContent());
        entry.setMood(normalizeMood(payload.getMood()));
        entry.setTags(cleanTags(payload.getTags()));
        entry.setBackfilled(payload.isBackfilled());
        entry.setUpdatedAt(now);
        return new EntryResponse(entryRepository.save(entry));
    }

    public List<EntryResponse> list(User user, String search, String tag, String mood, int limit) {
        String needle = search == null ? "" : search.strip().toLowerCase();
        String selectedTag = tag == null ? "" : tag.strip().toLowerCase();
        String moodFilter = mood == null ? "" : mood;

        return entryRepository.findByUserIdOrderByDateDesc(user.getId()).stream()
                .filter(e -> needle.isEmpty()
                        || e.getContent().toLowerCase().contains(needle)
                        || String.join(" ", e.getTags()).toLowerCase().contains(needle))
                .filter(e -> selectedTag.isEmpty() || e.getTags().contains(selectedTag))
                .filter(e -> moodFilter.isEmpty() || moodFilter.equals(e.getMood()))
                .limit(limit)
                .map(EntryResponse::new)
                .collect(Collectors.toList());
    }

    public EntryResponse get(User user, String entryId) {
        Entry entry = entryRepository.findByIdAndUserId(entryId, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND.value(), "Entry not found"));
        return new EntryResponse(entry);
    }

    public void delete(User user, String entryId) {
        long deleted = entryRepository.deleteByIdAndUserId(entryId, user.getId());
        if (deleted == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "Entry not found");
        }
    }

    public CalendarResponse calendar(User user, int year) {
        List<CalendarDay> days = entryRepository.findByUserIdAndDateStartingWith(user.getId(), String.format("%04d-", year))
                .stream()
                .filter(e -> e.getContent() != null && !e.getContent().isBlank())
                .map(e -> new CalendarDay(e.getDate(), wordCount(e.getContent()), e.getId()))
                .collect(Collectors.toList());
        return new CalendarResponse(year, days);
    }

    public List<EntryResponse> onThisDay(User user, String entryDate) {
        LocalDate target;
        try {
            target = LocalDate.parse(entryDate);
        } catch (DateTimeParseException ex) {
            throw new ApiException(422, "Use a valid YYYY-MM-DD date");
        }
        String monthDay = String.format("-%02d-%02d", target.getMonthValue(), target.getDayOfMonth());
        return entryRepository.findByUserIdOrderByDateDesc(user.getId()).stream()
                .filter(e -> e.getDate().length() == 10 && e.getDate().substring(4).equals(monthDay))
                .filter(e -> !e.getDate().equals(entryDate))
                .limit(20)
                .map(EntryResponse::new)
                .collect(Collectors.toList());
    }

    public List<Entry> allForUser(User user) {
        return entryRepository.findByUserIdOrderByDateDesc(user.getId());
    }

    private List<String> cleanTags(List<String> tags) {
        if (tags == null) return List.of();
        Set<String> seen = new LinkedHashSet<>();
        for (String tag : tags) {
            if (tag == null) continue;
            String cleaned = tag.strip().toLowerCase();
            while (cleaned.startsWith("#")) cleaned = cleaned.substring(1);
            if (!cleaned.isEmpty()) seen.add(cleaned);
            if (seen.size() >= 12) break;
        }
        return seen.stream().limit(12).collect(Collectors.toList());
    }

    private int wordCount(String content) {
        String trimmed = content.trim();
        if (trimmed.isEmpty()) return 0;
        return trimmed.split("\\s+").length;
    }
}
