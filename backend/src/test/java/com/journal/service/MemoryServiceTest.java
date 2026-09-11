package com.journal.service;

import com.journal.dto.MemoryResponse;
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
class MemoryServiceTest {

    @Mock
    EntryRepository entryRepository;

    MemoryService service;
    User user;

    Entry entry(String id, String date, String content, String... tags) {
        Entry e = new Entry();
        e.setId(id);
        e.setUserId("user-1");
        e.setDate(date);
        e.setContent(content);
        e.setMood("calm");
        e.setTags(tags.length == 0 ? List.of() : List.of(tags));
        e.setCreatedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        return e;
    }

    @BeforeEach
    void setUp() {
        service = new MemoryService(entryRepository);
        user = new User();
        user.setId("user-1");
        user.setTimezone("UTC");
    }

    @Test
    void surfacesRealThemesNotFillerWords() {
        lenient().when(entryRepository.findByUserIdOrderByDateDesc("user-1")).thenReturn(List.of(
                entry("a", "2026-09-09", "I finally wrote about the lighthouse keeper and the sea.", "sea"),
                entry("b", "2026-09-08", "Wrote again about the lighthouse and finally finished.", "sea"),
                entry("c", "2026-09-07", "The lighthouse keeper wrote back at last.", "sea")));
        MemoryResponse res = service.memories(user, "2026-09-09");
        List<String> titles = res.getSignals().stream().map(s -> s.getTitle()).toList();
        assertTrue(titles.stream().anyMatch(t -> t.contains("lighthouse")), "real theme surfaces, got: " + titles);
        assertFalse(titles.stream().anyMatch(t -> t.contains("finally") || t.contains("wrote")), "filler stays out, got: " + titles);
    }

    @Test
    void emptyJournalHasNoSignals() {
        when(entryRepository.findByUserIdOrderByDateDesc("user-1")).thenReturn(List.of());
        assertTrue(service.memories(user, "2026-09-09").getSignals().isEmpty());
    }
}
