package com.journal.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Synchronous, on-demand parsers for journal imports. No threads, no jobs,
 * no state — pure functions turning file text into entry drafts.
 */
public final class EntryImportParser {

    private EntryImportParser() {
    }

    public record ParsedEntry(String date, String content, String mood, List<String> tags) {
    }

    public record ParsedFile(List<ParsedEntry> entries, List<String> errors) {
    }

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Pattern MD_HEADING = Pattern.compile("^#{1,2}\\s+(\\d{4}-\\d{2}-\\d{2})\\s*$", Pattern.MULTILINE);
    private static final Pattern HASHTAG = Pattern.compile("(?:^|\\s)#([\\p{L}\\p{N}_-]+)");

    public static ParsedFile parse(String format, String text) {
        return switch (format.toLowerCase(Locale.ROOT)) {
            case "markdown", "md" -> parseMarkdown(text);
            case "json" -> parseJson(text);
            case "csv" -> parseCsv(text);
            case "dayone" -> parseDayOne(text);
            default -> throw new IllegalArgumentException("Unsupported format: " + format);
        };
    }

    static ParsedFile parseMarkdown(String text) {
        List<ParsedEntry> entries = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        Matcher m = MD_HEADING.matcher(text);
        List<int[]> bounds = new ArrayList<>();
        List<String> dates = new ArrayList<>();
        while (m.find()) {
            bounds.add(new int[]{m.start(), m.end()});
            dates.add(m.group(1));
        }
        if (bounds.isEmpty()) {
            errors.add("No dated headings found — use '# YYYY-MM-DD' to start each entry");
            return new ParsedFile(entries, errors);
        }
        for (int i = 0; i < bounds.size(); i++) {
            String date = dates.get(i);
            int bodyStart = bounds.get(i)[1];
            int bodyEnd = i + 1 < bounds.size() ? bounds.get(i + 1)[0] : text.length();
            String body = text.substring(bodyStart, bodyEnd).strip();
            if (!validDate(date)) {
                errors.add("Skipped invalid date: " + date);
                continue;
            }
            List<String> tags = new ArrayList<>();
            Matcher tm = HASHTAG.matcher(body);
            while (tm.find()) tags.add(tm.group(1).toLowerCase(Locale.ROOT));
            entries.add(new ParsedEntry(date, body, null, tags));
        }
        return new ParsedFile(entries, errors);
    }

    static ParsedFile parseJson(String text) {
        List<ParsedEntry> entries = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        try {
            JsonNode root = MAPPER.readTree(text);
            JsonNode array = root.isArray() ? root : root.path("entries");
            if (!array.isArray()) {
                errors.add("Expected a JSON array or an object with an 'entries' array");
                return new ParsedFile(entries, errors);
            }
            int index = 0;
            for (JsonNode node : array) {
                index++;
                String date = node.path("date").asText(null);
                String content = node.path("content").asText("");
                if (date == null || !validDate(date)) {
                    errors.add("Entry " + index + ": missing or invalid date, skipped");
                    continue;
                }
                String mood = normalizeMood(node.path("mood").asText(null));
                List<String> tags = new ArrayList<>();
                JsonNode tagNode = node.path("tags");
                if (tagNode.isArray()) {
                    for (JsonNode t : tagNode) tags.add(t.asText("").strip().toLowerCase(Locale.ROOT));
                }
                entries.add(new ParsedEntry(date, content, mood, tags));
            }
        } catch (Exception ex) {
            errors.add("Could not read JSON: " + ex.getMessage());
        }
        return new ParsedFile(entries, errors);
    }

    static ParsedFile parseCsv(String text) {
        List<ParsedEntry> entries = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        List<String> lines = splitCsvLines(text);
        if (lines.isEmpty()) {
            errors.add("Empty file");
            return new ParsedFile(entries, errors);
        }
        int start = 0;
        if (lines.get(0).toLowerCase(Locale.ROOT).startsWith("date")) start = 1;
        for (int i = start; i < lines.size(); i++) {
            List<String> cols = splitCsvRow(lines.get(i));
            if (cols.stream().allMatch(String::isBlank)) continue;
            String date = cols.size() > 0 ? cols.get(0).strip() : "";
            String content = cols.size() > 1 ? cols.get(1) : "";
            String mood = cols.size() > 2 ? normalizeMood(emptyToNull(cols.get(2).strip())) : null;
            List<String> tags = new ArrayList<>();
            if (cols.size() > 3) {
                for (String t : cols.get(3).split("[,;]")) {
                    String clean = t.strip().toLowerCase(Locale.ROOT).replaceAll("^#+", "");
                    if (!clean.isEmpty()) tags.add(clean);
                }
            }
            if (!validDate(date)) {
                errors.add("Line " + (i + 1) + ": invalid date, skipped");
                continue;
            }
            entries.add(new ParsedEntry(date, content, mood, tags));
        }
        return new ParsedFile(entries, errors);
    }

    static ParsedFile parseDayOne(String text) {
        List<ParsedEntry> entries = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        try {
            JsonNode root = MAPPER.readTree(text);
            JsonNode array = root.path("entries");
            if (!array.isArray()) {
                errors.add("Expected a Day One export with an 'entries' array");
                return new ParsedFile(entries, errors);
            }
            int index = 0;
            for (JsonNode node : array) {
                index++;
                String creation = node.path("creationDate").asText(null);
                String date = creation != null && creation.length() >= 10 ? creation.substring(0, 10) : null;
                // Day One v2 nests rich text; fall back to plain text field.
                String content = node.path("text").asText(null);
                if (content == null) content = node.path("richText").asText("");
                if (date == null || !validDate(date)) {
                    errors.add("Entry " + index + ": invalid creationDate, skipped");
                    continue;
                }
                List<String> tags = new ArrayList<>();
                JsonNode tagNode = node.path("tags");
                if (tagNode.isArray()) {
                    for (JsonNode t : tagNode) tags.add(t.asText("").strip().toLowerCase(Locale.ROOT));
                }
                entries.add(new ParsedEntry(date, content, null, tags));
            }
        } catch (Exception ex) {
            errors.add("Could not read Day One JSON: " + ex.getMessage());
        }
        return new ParsedFile(entries, errors);
    }

    static String normalizeMood(String mood) {
        if (mood == null || mood.isBlank()) return null;
        String clean = mood.strip().toLowerCase(Locale.ROOT);
        return EntryService.ALLOWED_MOODS.contains(clean) ? clean : null;
    }

    static boolean validDate(String date) {
        if (date == null) return false;
        try {
            LocalDate.parse(date);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    private static String emptyToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    /** Splits CSV text into logical lines, honouring quoted newlines. Quote
     * characters are preserved verbatim so {@link #splitCsvRow} can still
     * tell protected commas apart. */
    static List<String> splitCsvLines(String text) {
        List<String> lines = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '"') {
                current.append(c);
                if (quoted && i + 1 < text.length() && text.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if ((c == '\n' || c == '\r') && !quoted) {
                if (c == '\r' && i + 1 < text.length() && text.charAt(i + 1) == '\n') i++;
                lines.add(current.toString());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        if (!current.toString().isBlank() || !lines.isEmpty() && quoted) lines.add(current.toString());
        return lines;
    }

    /** Splits one CSV row into columns, honouring quotes and escapes. */
    static List<String> splitCsvRow(String row) {
        List<String> cols = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < row.length(); i++) {
            char c = row.charAt(i);
            if (c == '"') {
                if (quoted && i + 1 < row.length() && row.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (c == ',' && !quoted) {
                cols.add(current.toString());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        cols.add(current.toString());
        return cols;
    }
}
