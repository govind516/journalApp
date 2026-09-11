package com.journal.service;

import com.journal.dto.ReflectionResponse;
import com.journal.dto.TagCount;
import com.journal.exception.ApiException;
import com.journal.model.Entry;
import com.journal.model.User;
import com.journal.repository.EntryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Monthly reflection, composed locally from the month's own pages.
 * Statistics first, then a short narrative in the journal's voice —
 * noticing, never diagnosing.
 */
@Service
public class ReflectionService {

    private final EntryRepository entryRepository;

    public ReflectionService(EntryRepository entryRepository) {
        this.entryRepository = entryRepository;
    }

    @Transactional(readOnly = true)
    public ReflectionResponse reflect(User user, String yearMonth) {
        if (yearMonth == null || !yearMonth.matches("\\d{4}-\\d{2}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "Use a valid YYYY-MM month");
        }
        int year = Integer.parseInt(yearMonth.substring(0, 4));
        int month = Integer.parseInt(yearMonth.substring(5, 7));
        if (month < 1 || month > 12) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "Use a valid YYYY-MM month");
        }
        String monthName = Month.of(month).getDisplayName(TextStyle.FULL, Locale.ENGLISH);

        List<Entry> entries = entryRepository.findByUserIdAndDateStartingWith(user.getId(), yearMonth + "-").stream()
                .filter(e -> e.getContent() != null && !e.getContent().isBlank())
                .sorted(Comparator.comparing(Entry::getDate))
                .toList();

        if (entries.isEmpty()) {
            return new ReflectionResponse(yearMonth, "Your " + monthName, 0, 0, null, List.of(),
                    null, null, 0,
                    monthName + " stayed blank. There is no behind — there is only the next page, whenever it wants to be written.");
        }

        long days = entries.stream().map(Entry::getDate).distinct().count();

        Map<String, Long> moods = new LinkedHashMap<>();
        for (Entry e : entries) if (e.getMood() != null) moods.merge(e.getMood(), 1L, Long::sum);
        String topMood = moods.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(null);

        Map<String, Long> tags = new LinkedHashMap<>();
        for (Entry e : entries) for (String t : e.getTags()) tags.merge(t, 1L, Long::sum);
        List<TagCount> topTags = tags.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(3)
                .map(e -> new TagCount(e.getKey(), e.getValue()))
                .toList();

        Entry longest = entries.stream()
                .max(Comparator.comparingInt(e -> words(e.getContent())))
                .orElse(entries.get(0));

        StringBuilder narrative = new StringBuilder();
        narrative.append(monthName).append(" held ").append(entries.size())
                .append(entries.size() == 1 ? " page" : " pages")
                .append(" across ").append(days).append(days == 1 ? " day." : " days.");
        if (topMood != null) {
            narrative.append(" The prevailing feeling was ").append(topMood).append(".");
        }
        if (!topTags.isEmpty()) {
            narrative.append(" Much of it circled ");
            narrative.append(topTags.stream().map(t -> "#" + t.getTag()).toList().toString().replace("[", "").replace("]", ""));
            narrative.append(".");
        }
        narrative.append(" The longest sitting-down was ")
                .append(pretty(longest.getDate()))
                .append(" — ").append(words(longest.getContent())).append(" words worth keeping.");

        return new ReflectionResponse(yearMonth, "Your " + monthName, entries.size(), (int) days,
                topMood, topTags, longest.getId(), longest.getDate(), words(longest.getContent()),
                narrative.toString());
    }

    public String currentMonth(String timezone) {
        try {
            java.time.ZoneId zone = java.time.ZoneId.of(timezone == null || timezone.isBlank() ? "UTC" : timezone);
            return LocalDate.now(zone).toString().substring(0, 7);
        } catch (Exception ex) {
            return LocalDate.now(java.time.ZoneId.of("UTC")).toString().substring(0, 7);
        }
    }

    private int words(String content) {
        String trimmed = content == null ? "" : content.trim();
        return trimmed.isEmpty() ? 0 : trimmed.split("\\s+").length;
    }

    private String pretty(String iso) {
        try {
            return LocalDate.parse(iso).format(java.time.format.DateTimeFormatter.ofPattern("MMMM d", Locale.ENGLISH));
        } catch (Exception ex) {
            return iso;
        }
    }
}
