package com.journal.service;

import com.journal.dto.Badge;
import com.journal.dto.InsightsResponse;
import com.journal.dto.MoodPoint;
import com.journal.dto.TagCount;
import com.journal.model.Entry;
import com.journal.model.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class InsightsService {

    private final EntryService entryService;

    public InsightsService(EntryService entryService) {
        this.entryService = entryService;
    }

    @Transactional(readOnly = true)
    public InsightsResponse compute(User user) {
        List<Entry> entries = entryService.allForUser(user);

        // "written" days exclude backfilled entries, mirroring the original streak semantics.
        SortedSet<String> written = entries.stream()
                .filter(e -> hasContent(e) && !e.isBackfilled())
                .map(Entry::getDate)
                .collect(Collectors.toCollection(TreeSet::new));

        String todayIso = entryService.todayIso(user.getTimezone());
        LocalDate today = LocalDate.parse(todayIso);
        LocalDate cursor = written.contains(today.toString()) ? today : today.minusDays(1);
        int current = 0;
        while (written.contains(cursor.toString())) {
            current++;
            cursor = cursor.minusDays(1);
        }

        int longest = 0;
        int run = 0;
        LocalDate previous = null;
        for (String dateStr : written) {
            LocalDate value = LocalDate.parse(dateStr);
            if (previous != null && value.equals(previous.plusDays(1))) {
                run++;
            } else {
                run = 1;
            }
            longest = Math.max(longest, run);
            previous = value;
        }

        Map<String, Long> moodCounts = new LinkedHashMap<>();
        List<MoodPoint> moodPoints = new ArrayList<>();
        entries.stream()
                .filter(e -> hasContent(e) && EntryService.isKnownMood(e.getMood()) && e.getMood() != null)
                .sorted(Comparator.comparing(Entry::getDate))
                .forEach(e -> {
                    moodCounts.merge(e.getMood(), 1L, Long::sum);
                    moodPoints.add(new MoodPoint(e.getDate(), e.getMood()));
                });
        List<MoodPoint> trimmedPoints = moodPoints.size() > 60
                ? moodPoints.subList(moodPoints.size() - 60, moodPoints.size())
                : moodPoints;

        Map<String, Long> tagFrequency = new LinkedHashMap<>();
        entries.stream()
                .filter(this::hasContent)
                .flatMap(e -> e.getTags().stream())
                .forEach(tag -> tagFrequency.merge(tag, 1L, Long::sum));
        List<TagCount> tagCounts = tagFrequency.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .map(entry -> new TagCount(entry.getKey(), entry.getValue()))
                .collect(Collectors.toList());

        List<Badge> badges = List.of(
                new Badge("First Ink", "Write your first reflection", written.size() >= 1),
                new Badge("3-Day Rhythm", "Write on three consecutive days", longest >= 3),
                new Badge("7-Day Reflection", "Keep a seven-day writing rhythm", longest >= 7),
                new Badge("Seasonal Writer", "Collect 30 written days", written.size() >= 30)
        );

        return new InsightsResponse(current, longest, written.size(), written.size(),
                moodCounts, trimmedPoints, tagCounts, badges);
    }

    private boolean hasContent(Entry entry) {
        return entry.getContent() != null && !entry.getContent().isBlank();
    }
}
