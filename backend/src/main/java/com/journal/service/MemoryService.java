package com.journal.service;

import com.journal.dto.MemoryResponse;
import com.journal.dto.MemorySignal;
import com.journal.model.Entry;
import com.journal.model.User;
import com.journal.repository.EntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
/**
 * Local-first memory: deterministic signals mined from the user's own
 * entries — repeated words, returning tags, prevailing moods, anniversaries.
 * No network, no model, nothing leaves the device.
 */
@Service
public class MemoryService {

    private static final Set<String> STOPWORDS = Set.of(
            "about", "after", "again", "against", "around", "because", "before", "being",
            "between", "both", "came", "come", "could", "day", "doing", "down", "each",
            "even", "every", "feel", "feeling", "felt", "from", "going", "good", "have",
            "having", "here", "hers", "him", "into", "just", "keep", "kind", "know",
            "like", "little", "long", "look", "looked", "made", "make", "many", "might",
            "more", "morning", "most", "much", "myself", "never", "only", "other",
            "ought", "over", "same", "should", "since", "small", "some", "something",
            "still", "such", "take", "than", "that", "their", "them", "then", "there",
            "these", "they", "thing", "think", "this", "those", "through", "time",
            "today", "under", "until", "very", "want", "watch", "when", "where",
            "which", "while", "with", "within", "without", "would", "year", "your",
            "nothing", "everything", "really", "quite", "always",
            "away", "back", "ever", "also", "well", "went", "wrote", "write",
            "writing", "written", "finally", "things",
            "days", "page", "pages", "journal", "entry", "entries"
    );

    private final EntryRepository entryRepository;

    public MemoryService(EntryRepository entryRepository) {
        this.entryRepository = entryRepository;
    }

    @Transactional(readOnly = true)
    public MemoryResponse memories(User user, String todayIso) {
        List<Entry> entries = entryRepository.findByUserIdOrderByDateDesc(user.getId());
        List<Entry> written = entries.stream()
                .filter(e -> e.getContent() != null && !e.getContent().isBlank())
                .toList();
        List<MemorySignal> signals = new ArrayList<>();
        signals.addAll(topPhrases(written));
        signals.addAll(returningTags(written));
        prevailingMood(written).ifPresent(signals::add);
        anniversaryCount(written, todayIso).ifPresent(signals::add);
        return new MemoryResponse(signals.stream().limit(8).toList());
    }

    private List<MemorySignal> topPhrases(List<Entry> entries) {
        Map<String, Long> counts = new LinkedHashMap<>();
        Map<String, List<String>> owners = new HashMap<>();
        for (Entry entry : entries) {
            Set<String> seen = new HashSet<>();
            for (String word : entry.getContent().toLowerCase().split("[^a-z]+")) {
                if (word.length() < 4 || STOPWORDS.contains(word) || !seen.add(word)) continue;
                counts.merge(word, 1L, Long::sum);
                owners.computeIfAbsent(word, k -> new ArrayList<>());
                if (owners.get(word).size() < 5) owners.get(word).add(entry.getId());
            }
        }
        return counts.entrySet().stream()
                .filter(e -> e.getValue() >= 3)
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(3)
                .map(e -> new MemorySignal(
                        "phrase",
                        "“" + e.getKey() + "” keeps returning",
                        "You have written about it " + e.getValue() + " times.",
                        owners.getOrDefault(e.getKey(), List.of())))
                .toList();
    }

    private List<MemorySignal> returningTags(List<Entry> entries) {
        Map<String, Long> counts = new LinkedHashMap<>();
        Map<String, List<String>> owners = new HashMap<>();
        for (Entry entry : entries) {
            for (String tag : entry.getTags()) {
                counts.merge(tag, 1L, Long::sum);
                owners.computeIfAbsent(tag, k -> new ArrayList<>());
                if (owners.get(tag).size() < 5) owners.get(tag).add(entry.getId());
            }
        }
        return counts.entrySet().stream()
                .filter(e -> e.getValue() >= 2)
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(2)
                .map(e -> new MemorySignal(
                        "tag",
                        "#" + e.getKey() + " is a thread",
                        e.getValue() + " pages carry this thread.",
                        owners.getOrDefault(e.getKey(), List.of())))
                .toList();
    }

    private java.util.Optional<MemorySignal> prevailingMood(List<Entry> entries) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Entry entry : entries) {
            if (entry.getMood() != null && EntryService.isKnownMood(entry.getMood())) counts.merge(entry.getMood(), 1L, Long::sum);
        }
        return counts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .filter(e -> e.getValue() >= 3)
                .map(e -> new MemorySignal(
                        "mood",
                        "Lately, " + e.getKey(),
                        "Your most frequent feeling across " + entries.size() + " pages.",
                        List.of()));
    }

    private java.util.Optional<MemorySignal> anniversaryCount(List<Entry> entries, String todayIso) {
        if (todayIso == null || todayIso.length() != 10) return java.util.Optional.empty();
        String monthDay = todayIso.substring(4);
        long count = entries.stream()
                .filter(e -> e.getDate().length() == 10 && e.getDate().substring(4).equals(monthDay) && !e.getDate().equals(todayIso))
                .count();
        if (count == 0) return java.util.Optional.empty();
        return java.util.Optional.of(new MemorySignal(
                "anniversary",
                "This date has history",
                count + (count == 1 ? " page from another year shares today’s date." : " pages from other years share today’s date."),
                List.of()));
    }
}
