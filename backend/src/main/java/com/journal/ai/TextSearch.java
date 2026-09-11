package com.journal.ai;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Small honest text tools for local retrieval: normalization, synonyms and
 * ranked matching. No embeddings, no model — just careful counting that can
 * explain itself ("related words I counted: job, career").
 */
public final class TextSearch {

    private TextSearch() {
    }

    /** Canonical concept groups. Each group maps to itself plus relatives. */
    private static final List<Set<String>> CONCEPTS = List.of(
            Set.of("work", "job", "career", "employment", "office", "boss", "meeting", "project", "deadline", "colleague"),
            Set.of("family", "mom", "dad", "mother", "father", "parents", "home", "sister", "brother"),
            Set.of("health", "body", "sleep", "doctor", "exercise", "running", "walk", "tired", "sick"),
            Set.of("travel", "trip", "flight", "vacation", "journey", "sea", "beach", "train"),
            Set.of("money", "finance", "budget", "rent", "bills", "salary", "expensive"),
            Set.of("friend", "friends", "dinner", "party", "wedding", "companion"),
            Set.of("learn", "learning", "study", "school", "course", "python", "reading", "book"),
            Set.of("calm", "peaceful", "relaxed", "quiet", "still"),
            Set.of("grateful", "thankful", "gratitude", "blessed"),
            Set.of("inspired", "motivated", "excited", "energized", "hopeful"),
            Set.of("restless", "anxious", "worried", "stressed", "nervous", "uneasy"),
            Set.of("pensive", "sad", "melancholy", "reflective", "lonely", "blue", "down")
    );

    private static final Map<String, Set<String>> EXPANSIONS = new HashMap<>();

    static {
        for (Set<String> concept : CONCEPTS) {
            for (String word : concept) {
                EXPANSIONS.merge(word, concept, (a, b) -> {
                    var merged = new java.util.HashSet<>(a);
                    merged.addAll(b);
                    return Set.copyOf(merged);
                });
            }
        }
    }

    public static String normalize(String text) {
        if (text == null) return "";
        String lowered = text.toLowerCase(Locale.ROOT);
        String ascii = Normalizer.normalize(lowered, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return ascii.replaceAll("[^a-z0-9 ]", " ").replaceAll("\\s+", " ").strip();
    }

    public static List<String> tokens(String text) {
        String clean = normalize(text);
        if (clean.isEmpty()) return List.of();
        return List.of(clean.split(" "));
    }

    /** The query term plus its relatives, for honest query expansion. */
    public static Set<String> expand(String term) {
        String key = normalize(term).replaceAll(" ", "");
        if (key.isEmpty()) return Set.of();
        Set<String> relatives = EXPANSIONS.getOrDefault(key, Set.of(key));
        // Simple plural folding so "deadlines" also finds "deadline".
        var out = new java.util.HashSet<>(relatives);
        for (String w : relatives) {
            if (w.endsWith("s") && w.length() > 4) out.add(w.substring(0, w.length() - 1));
            else out.add(w + "s");
        }
        return Set.copyOf(out);
    }

    /** Significant content words of a question, for trigger-less topic search. */
    private static final Set<String> QUESTION_WORDS = Set.of(
            "what", "when", "where", "which", "whom", "whose", "how", "does",
            "been", "lately", "recently", "often", "about", "there", "here",
            "have", "with", "from", "that", "this", "feel", "feeling", "felt",
            "make", "made", "days", "tonight", "today");

    public static List<String> keywords(String question) {
        List<String> out = new ArrayList<>();
        for (String token : tokens(question)) {
            if (token.length() >= 4 && !QUESTION_WORDS.contains(token) && !out.contains(token)) {
                out.add(token);
            }
        }
        return out;
    }

    /** Moods whose vocabulary appears in the question, if any. */    public static List<String> moodsMentioned(String question) {
        String norm = " " + normalize(question) + " ";
        List<String> found = new ArrayList<>();
        Map<String, String> moodWords = new LinkedHashMap<>();
        moodWords.put("calm", "calm");
        moodWords.put("grateful", "grateful");
        moodWords.put("inspired", "inspired");
        moodWords.put("restless", "restless");
        moodWords.put("pensive", "pensive");
        for (Map.Entry<String, String> e : moodWords.entrySet()) {
            for (String w : expand(e.getKey())) {
                if (norm.contains(" " + w + " ") || norm.contains(" " + w + "s ")) {
                    found.add(e.getValue());
                    break;
                }
            }
        }
        return found;
    }

    public record Scored(String id, double score, Set<String> matched) {
    }

    /**
     * Ranks entry indexes against expanded terms. Tag hits count most, then
     * content hits, then mood agreement. Recency breaks ties so newer pages
     * surface first. Only entries scoring above zero are returned.
     */
    public static List<Scored> rank(List<EntryText> entries, Set<String> terms, Set<String> moods) {
        List<Scored> out = new ArrayList<>();
        for (int i = 0; i < entries.size(); i++) {
            EntryText e = entries.get(i);
            Set<String> matched = new java.util.HashSet<>();
            double score = 0;
            String body = " " + normalize(e.content()) + " ";
            for (String term : terms) {
                String needle = " " + term + " ";
                boolean inTags = e.tags().stream().anyMatch(t -> normalize(t).equals(term) || normalize(t).contains(term));
                boolean inBody = body.contains(needle);
                if (inTags) {
                    score += 3;
                    matched.add(term);
                } else if (inBody) {
                    score += 1;
                    matched.add(term);
                }
            }
            if (!moods.isEmpty() && e.mood() != null && moods.contains(e.mood())) {
                score += 1.5;
            }
            if (score > 0) {
                // Gentle recency: earlier in the (newest-first) list wins ties.
                score += (entries.size() - i) * 0.001;
                out.add(new Scored(e.id(), score, Set.copyOf(matched)));
            }
        }
        out.sort((a, b) -> Double.compare(b.score(), a.score()));
        return out;
    }

    public record EntryText(String id, String content, List<String> tags, String mood) {
    }
}
