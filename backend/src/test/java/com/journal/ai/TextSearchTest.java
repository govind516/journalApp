package com.journal.ai;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class TextSearchTest {

    @Test
    void normalizesCaseAccentsAndPunctuation() {
        assertEquals("cafe au lait", TextSearch.normalize("Café, au lait!"));
        assertEquals("", TextSearch.normalize(null));
    }

    @Test
    void expandsJobToWorkFamily() {
        Set<String> expanded = TextSearch.expand("job");
        assertTrue(expanded.contains("work"), "job should find work");
        assertTrue(expanded.contains("career"), "job should find career");
    }

    @Test
    void detectsMoodVocabulary() {
        assertEquals(List.of("restless"), TextSearch.moodsMentioned("days I feel anxious"));
        assertEquals(List.of("grateful"), TextSearch.moodsMentioned("so thankful lately"));
        assertTrue(TextSearch.moodsMentioned("what a Tuesday").isEmpty());
    }

    @Test
    void ranksTagHitsAboveBodyMentions() {
        var entries = List.of(
                new TextSearch.EntryText("body-only", "my job is fine I guess", List.of(), null),
                new TextSearch.EntryText("tag-hit", "unrelated words here", List.of("work"), null));
        var ranked = TextSearch.rank(entries, TextSearch.expand("job"), Set.of());
        assertEquals(2, ranked.size());
        assertEquals("tag-hit", ranked.get(0).id());
        assertTrue(ranked.get(0).matched().contains("work"));
    }

    @Test
    void excludesEntriesWithNoMatch() {
        var entries = List.of(
                new TextSearch.EntryText("a", "completely unrelated words", List.of(), null));
        assertTrue(TextSearch.rank(entries, TextSearch.expand("job"), Set.of()).isEmpty());
    }

    @Test
    void prefersRecentPagesOnTies() {
        // Lists arrive newest-first (repository order); ties keep that order.
        var entries = List.of(
                new TextSearch.EntryText("newer", "deadline week again", List.of(), null),
                new TextSearch.EntryText("older", "deadline week again", List.of(), null));
        var ranked = TextSearch.rank(entries, Set.of("deadline"), Set.of());
        assertEquals("newer", ranked.get(0).id());
    }
}
