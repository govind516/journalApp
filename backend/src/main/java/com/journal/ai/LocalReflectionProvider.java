package com.journal.ai;

import com.journal.dto.AskEntry;
import com.journal.dto.AskResponse;
import com.journal.model.Entry;
import com.journal.model.User;
import com.journal.repository.EntryRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Local heuristic provider: retrieval over the user's own entries plus
 * honest template answers. Says what it found, never invents.
 */
@Service
@ConditionalOnProperty(name = "app.ai.provider", havingValue = "local", matchIfMissing = true)
public class LocalReflectionProvider implements ReflectionProvider {

    private static final Set<String> BRIGHT = Set.of("grateful", "calm", "inspired");
    private static final Set<String> HEAVY = Set.of("restless", "pensive");
    private static final Pattern LAST_N = Pattern.compile("last\\s+(\\d{1,2})");

    private final EntryRepository entryRepository;

    public LocalReflectionProvider(EntryRepository entryRepository) {
        this.entryRepository = entryRepository;
    }

    @Override
    public String name() {
        return "local";
    }

    @Override
    @Transactional(readOnly = true)
    public AskResponse answer(User user, String question) {
        List<Entry> entries = entryRepository.findByUserIdOrderByDateDesc(user.getId()).stream()
                .filter(e -> e.getContent() != null && !e.getContent().isBlank())
                .toList();
        if (entries.isEmpty()) {
            return new AskResponse(
                    "There are no pages to look through yet. Write a few days first, then ask me again — I will be here.",
                    List.of(), name());
        }
        String q = question.toLowerCase(Locale.ROOT);
        DateWindow window = DateWindow.parse(q);
        List<Entry> scope = window == null ? entries : window.filter(entries);
        if (containsAny(q, "happiest", "happiest", "joy", "grateful", "good", "best", "light")) {
            return brightest(scope, window, q.contains("year") || q.contains("month") ? 60 : 21);
        }
        if (containsAny(q, "stuck", "struggling", "hard", "difficult", "heavy", "rough", "bad")) {
            return heaviest(scope, window);
        }
        if (containsAny(q, "goal") || (containsAny(q, "again", "coming back", "keeps", "recurring"))) {
            return returningThemes(entries);
        }
        if (containsAny(q, "summar")) {
            return summarize(scope, window, lastN(q, 10));
        }
        List<String> moodWords = TextSearch.moodsMentioned(q);
        if (!moodWords.isEmpty()) {
            return moodPages(scope, window, moodWords);
        }
        String topic = topicOf(q);
        if (topic != null) {
            return aboutTopic(scope, window, topic);
        }
        for (String keyword : TextSearch.keywords(q)) {
            List<Entry> picks = findTopicEntries(scope, keyword);
            if (!picks.isEmpty()) {
                return topicAnswer(scope, window, keyword, picks);
            }
        }
        return recent(entries);
    }

    private AskResponse brightest(List<Entry> entries, DateWindow window, int days) {
        LocalDate cutoff = LocalDate.now().minusDays(days);
        List<Entry> picks = entries.stream()
                .filter(e -> e.getMood() != null && BRIGHT.contains(e.getMood()))
                .filter(e -> isOnOrAfter(e.getDate(), cutoff))
                .limit(3)
                .toList();
        if (picks.isEmpty()) {
            picks = entries.stream()
                    .filter(e -> e.getMood() != null && BRIGHT.contains(e.getMood()))
                    .limit(3).toList();
        }
        if (picks.isEmpty()) {
            return new AskResponse(
                    "You have not named a bright feeling yet. When a good day comes, mark it — then this answer will have somewhere to point.",
                    List.of(), name());
        }
        return new AskResponse(
                "The brightest pages I can find" + windowSuffix(window) + " are these. " + describe(picks.get(0)) + " seems to hold the most light.",
                toSummaries(picks), name());
    }

    private AskResponse heaviest(List<Entry> entries, DateWindow window) {
        List<Entry> picks = entries.stream()
                .filter(e -> e.getMood() != null && HEAVY.contains(e.getMood()))
                .limit(3)
                .toList();
        if (picks.isEmpty()) {
            return new AskResponse(
                    "I cannot find a page where you named a hard feeling. That is either a gentle stretch — or feelings waiting to be named.",
                    List.of(), name());
        }
        return new AskResponse(
                "These pages carry the most weight" + windowSuffix(window) + ". " + describe(picks.get(0)) + " — you came back to the page anyway, which matters more than the mood.",
                toSummaries(picks), name());
    }

    private AskResponse returningThemes(List<Entry> entries) {
        var tags = new java.util.LinkedHashMap<String, Long>();
        for (Entry e : entries) for (String t : e.getTags()) tags.merge(t, 1L, Long::sum);
        var top = tags.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(3).toList();
        if (top.isEmpty()) {
            return new AskResponse(
                    "Nothing has repeated yet — which makes sense with few pages. Tag the threads of your life and I will start keeping track of what returns.",
                    List.of(), name());
        }
        String themes = top.stream().map(e -> "#" + e.getKey() + " (" + e.getValue() + " pages)").toList().toString();
        List<Entry> picks = entries.stream()
                .filter(e -> e.getTags().contains(top.get(0).getKey()))
                .limit(3).toList();
        return new AskResponse(
                "What keeps coming back: " + themes.replace("[", "").replace("]", "") + ". These pages hold the strongest thread.",
                toSummaries(picks), name());
    }

    private AskResponse summarize(List<Entry> entries, DateWindow window, int n) {
        List<Entry> picks = entries.stream().limit(Math.max(1, Math.min(20, n))).toList();
        StringBuilder sb = new StringBuilder("The last " + picks.size() + " pages" + windowSuffix(window) + ", briefly. ");
        for (Entry e : picks) {
            sb.append(pretty(e.getDate())).append(": ").append(firstSentence(e.getContent())).append(" ");
        }
        return new AskResponse(sb.toString().strip(), toSummaries(picks), name());
    }

    private AskResponse moodPages(List<Entry> entries, DateWindow window, List<String> moods) {
        List<Entry> picks = entries.stream()
                .filter(e -> e.getMood() != null && moods.contains(e.getMood()))
                .limit(3)
                .toList();
        if (picks.isEmpty()) {
            return new AskResponse(
                    "No page names that feeling" + windowSuffix(window) + ". When one comes, mark it — then this answer will have somewhere to point.",
                    List.of(), name());
        }
        return new AskResponse(
                "Pages where you felt " + String.join(" or ", moods) + windowSuffix(window) + ". " + describe(picks.get(0)) + " is the most recent.",
                toSummaries(picks), name());
    }

    private AskResponse aboutTopic(List<Entry> entries, DateWindow window, String topic) {
        List<Entry> picks = findTopicEntries(entries, topic);
        if (picks.isEmpty()) {
            return new AskResponse(
                    "I searched every page for “" + topic + "” and related words" + windowSuffix(window) + " and found nothing solid. It may live under different words — try another.",
                    List.of(), name());
        }
        return topicAnswer(entries, window, topic, picks);
    }

    private List<Entry> findTopicEntries(List<Entry> entries, String topic) {
        Set<String> terms = TextSearch.expand(topic);
        List<TextSearch.EntryText> texts = entries.stream()
                .map(e -> new TextSearch.EntryText(e.getId(), e.getContent(), e.getTags(), e.getMood()))
                .toList();
        List<TextSearch.Scored> ranked = TextSearch.rank(texts, terms, Set.of());
        Map<String, Entry> byId = new HashMap<>();
        for (Entry e : entries) byId.put(e.getId(), e);
        return ranked.stream()
                .filter(s -> s.score() >= 2 || s.matched().size() >= 2)
                .limit(5)
                .map(s -> byId.get(s.id()))
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private AskResponse topicAnswer(List<Entry> entries, DateWindow window, String topic, List<Entry> picks) {
        Set<String> terms = TextSearch.expand(topic);
        List<TextSearch.EntryText> texts = entries.stream()
                .map(e -> new TextSearch.EntryText(e.getId(), e.getContent(), e.getTags(), e.getMood()))
                .toList();
        Set<String> counted = new java.util.TreeSet<>();
        for (TextSearch.Scored s : TextSearch.rank(texts, terms, Set.of())) {
            if (s.score() >= 2 || s.matched().size() >= 2) counted.addAll(s.matched());
        }
        counted.remove(topic);
        String countedNote = counted.isEmpty() ? "" : " Related words I counted: " + String.join(", ", counted.stream().limit(4).toList()) + ".";
        return new AskResponse(
                picks.size() + (picks.size() == 1 ? " page speaks of " : " pages speak of ") + "“" + topic + "”" + windowSuffix(window) + "." + countedNote + " The most recent is " + describe(picks.get(0)) + ".",
                toSummaries(picks), name());
    }

    private String windowSuffix(DateWindow window) {
        return window == null ? "" : " " + window.label();
    }

    private AskResponse recent(List<Entry> entries) {
        List<Entry> picks = entries.stream().limit(3).toList();
        return new AskResponse(
                "Start here — your most recent pages. If you ask about happiness, hard days, goals, or a topic, I will look with more care.",
                toSummaries(picks), name());
    }

    private String topicOf(String q) {
        for (String trigger : List.of("about", "related to", "regarding", "on")) {
            int i = q.indexOf(trigger + " ");
            if (i >= 0) {
                String rest = q.substring(i + trigger.length() + 1).replaceAll("[?.!].*$", "").strip();
                if (rest.length() >= 3 && rest.length() <= 30 && !rest.contains(" ")) return rest;
                if (rest.contains(" ")) {
                    String first = rest.split("\\s+")[0];
                    if (first.length() >= 3) return first;
                }
            }
        }
        Matcher m = Pattern.compile("show me (.+?)[?.!]?$").matcher(q);
        if (m.find() && m.group(1).length() >= 3) {
            String[] words = m.group(1).split("\\s+");
            return words[words.length - 1];
        }
        return null;
    }

    private int lastN(String q, int fallback) {
        Matcher m = LAST_N.matcher(q);
        if (m.find()) {
            try { return Math.max(1, Math.min(20, Integer.parseInt(m.group(1)))); } catch (NumberFormatException ignored) { }
        }
        return fallback;
    }

    /** A parsed time window like "this week" or "in September", if the question names one. */
    record DateWindow(LocalDate start, LocalDate end, String label) {
        static DateWindow parse(String q) {
            LocalDate today = LocalDate.now();
            if (q.contains("this week")) return new DateWindow(today.minusDays(6), today, "over the last 7 days");
            if (q.contains("last week")) return new DateWindow(today.minusDays(13), today.minusDays(7), "over the previous 7 days");
            if (q.contains("this month")) return new DateWindow(today.withDayOfMonth(1), today, "this month");
            if (q.contains("last month")) {
                LocalDate first = today.minusMonths(1).withDayOfMonth(1);
                return new DateWindow(first, first.withDayOfMonth(first.lengthOfMonth()), "last month");
            }
            for (Map.Entry<String, Integer> e : List.of(
                    Map.entry("january", 1), Map.entry("february", 2), Map.entry("march", 3),
                    Map.entry("april", 4), Map.entry("may", 5), Map.entry("june", 6),
                    Map.entry("july", 7), Map.entry("august", 8), Map.entry("september", 9),
                    Map.entry("october", 10), Map.entry("november", 11), Map.entry("december", 12)).stream().toList()) {
                if (q.contains(e.getKey())) {
                    int year = today.getYear();
                    Matcher ym = Pattern.compile(e.getKey() + "\\s+(20\\d{2})").matcher(q);
                    if (ym.find()) {
                        try { year = Integer.parseInt(ym.group(1)); } catch (NumberFormatException ignored) { }
                    } else if (e.getValue() > today.getMonthValue()) {
                        year -= 1;
                    }
                    LocalDate first = LocalDate.of(year, e.getValue(), 1);
                    return new DateWindow(first, first.withDayOfMonth(first.lengthOfMonth()), "in " + e.getKey() + " " + year);
                }
            }
            Matcher y = Pattern.compile("(20\\d{2})").matcher(q);
            if (y.find()) {
                try {
                    int year = Integer.parseInt(y.group(1));
                    return new DateWindow(LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31), "in " + year);
                } catch (Exception ignored) { }
            }
            return null;
        }

        List<Entry> filter(List<Entry> entries) {
            return entries.stream().filter(e -> {
                try {
                    LocalDate d = LocalDate.parse(e.getDate());
                    return !d.isBefore(start) && !d.isAfter(end);
                } catch (Exception ex) {
                    return false;
                }
            }).toList();
        }
    }

    private boolean containsAny(String q, String... words) {
        for (String w : words) if (q.contains(w)) return true;
        return false;
    }

    private boolean isOnOrAfter(String iso, LocalDate cutoff) {
        try { return !LocalDate.parse(iso).isBefore(cutoff); } catch (Exception ex) { return true; }
    }

    private String describe(Entry e) {
        return pretty(e.getDate());
    }

    private String pretty(String iso) {
        try {
            return LocalDate.parse(iso).format(DateTimeFormatter.ofPattern("MMMM d", Locale.ENGLISH));
        } catch (Exception ex) {
            return iso;
        }
    }

    private String firstSentence(String content) {
        String oneLine = content.strip().replaceAll("\\s+", " ");
        int end = oneLine.length();
        for (char c : new char[]{'.', '!', '?'}) {
            int i = oneLine.indexOf(c);
            if (i > 0) end = Math.min(end, i + 1);
        }
        String sentence = oneLine.substring(0, Math.min(end, 160)).strip();
        return sentence.isEmpty() ? oneLine.substring(0, Math.min(120, oneLine.length())) : sentence;
    }

    private List<AskEntry> toSummaries(List<Entry> picks) {
        List<AskEntry> out = new ArrayList<>();
        for (Entry e : picks) {
            String oneLine = e.getContent().strip().replaceAll("\\s+", " ");
            String excerpt = oneLine.length() > 140 ? oneLine.substring(0, 140) + "…" : oneLine;
            out.add(new AskEntry(e.getId(), e.getDate(), excerpt, e.getMood()));
        }
        return out;
    }
}
