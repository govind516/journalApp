package com.journal.ai;

import com.journal.dto.AskResponse;
import com.journal.model.Entry;
import com.journal.model.User;
import com.journal.repository.EntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LocalReflectionProviderTest {

    @Mock
    EntryRepository entryRepository;

    LocalReflectionProvider provider;
    User user;

    Entry entry(String id, String date, String content, String mood, String... tags) {
        Entry e = new Entry();
        e.setId(id);
        e.setUserId("user-1");
        e.setDate(date);
        e.setContent(content);
        e.setMood(mood);
        e.setTags(tags.length == 0 ? List.of() : List.of(tags));
        e.setCreatedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        return e;
    }

    @BeforeEach
    void setUp() {
        provider = new LocalReflectionProvider(entryRepository);
        user = new User();
        user.setId("user-1");
        user.setTimezone("UTC");
        lenient().when(entryRepository.findByUserIdOrderByDateDesc("user-1")).thenReturn(List.of(
                entry("new", "2026-09-09", "The work project finally landed after a hard deadline week.", "calm", "work"),
                entry("old", "2026-08-10", "Anxious about money and the rent again.", "restless", "money"),
                entry("sea", "2026-07-04", "Salt on everything at the sea. Floated past the break.", "grateful", "travel")));
    }

    @Test
    void jobFindsWorkThroughSynonyms() {
        AskResponse res = provider.answer(user, "show me entries about job");
        assertEquals("local", res.getSource());
        assertFalse(res.getEntries().isEmpty());
        assertEquals("new", res.getEntries().get(0).getId());
        assertTrue(res.getAnswer().contains("work") || res.getAnswer().contains("job"));
    }

    @Test
    void anxiousFindsRestlessPages() {
        AskResponse res = provider.answer(user, "when did I feel anxious?");
        assertFalse(res.getEntries().isEmpty());
        assertEquals("old", res.getEntries().get(0).getId());
    }

    @Test
    void bareQuestionFallsBackToKeywords() {
        AskResponse res = provider.answer(user, "how is my job going?");
        assertFalse(res.getEntries().isEmpty());
        assertEquals("new", res.getEntries().get(0).getId());
    }

    @Test
    void unknownTopicStaysHonest() {
        AskResponse res = provider.answer(user, "show me entries about zyxwvu");
        assertTrue(res.getEntries().isEmpty());
        assertTrue(res.getAnswer().contains("found nothing solid"));
    }

    @Test
    void emptyJournalGetsAGentleAnswer() {
        when(entryRepository.findByUserIdOrderByDateDesc("user-1")).thenReturn(List.of());
        AskResponse res = provider.answer(user, "what made me happy?");
        assertTrue(res.getEntries().isEmpty());
        assertTrue(res.getAnswer().contains("no pages"));
    }

    @Test
    void monthWindowConstrainsResults() {
        AskResponse res = provider.answer(user, "summarize August");
        assertTrue(res.getEntries().stream().allMatch(e -> e.getDate().startsWith("2026-08")));
    }
}
