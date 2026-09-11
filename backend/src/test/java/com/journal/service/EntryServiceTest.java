package com.journal.service;

import com.journal.dto.EntryResponse;
import com.journal.dto.EntryWrite;
import com.journal.exception.ApiException;
import com.journal.model.User;
import com.journal.repository.EntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EntryServiceTest {

    @Mock
    EntryRepository entryRepository;

    EntryService service;
    User user;

    @BeforeEach
    void setUp() {
        service = new EntryService(entryRepository);
        user = new User();
        user.setId("user-1");
        user.setTimezone("UTC");
        lenient().when(entryRepository.findByUserIdAndDate(eq("user-1"), anyString())).thenReturn(Optional.empty());
        lenient().when(entryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private EntryWrite write(String date, String mood) {
        EntryWrite payload = new EntryWrite();
        payload.setDate(date);
        payload.setContent("Some true sentences.");
        payload.setMood(mood);
        payload.setTags(List.of());
        payload.setBackfilled(false);
        return payload;
    }

    @Test
    void rejectsUnknownMoodWith400() {
        ApiException ex = assertThrows(ApiException.class,
                () -> service.saveByDate(user, "2026-09-09", write("2026-09-09", "hopeful")));
        assertEquals(400, ex.getStatus());
        verify(entryRepository, never()).save(any());
    }

    @Test
    void acceptsEveryKnownMood() {
        for (String mood : List.of("calm", "pensive", "inspired", "restless", "grateful")) {
            EntryResponse res = service.saveByDate(user, "2026-09-09", write("2026-09-09", mood));
            assertEquals(mood, res.getMood());
        }
    }

    @Test
    void acceptsUnnamedMood() {
        assertNull(service.saveByDate(user, "2026-09-09", write("2026-09-09", null)).getMood());
        assertNull(service.saveByDate(user, "2026-09-09", write("2026-09-09", "  ")).getMood());
    }

    @Test
    void normalizesMoodCasing() {
        ArgumentCaptor<com.journal.model.Entry> captor = ArgumentCaptor.forClass(com.journal.model.Entry.class);
        service.saveByDate(user, "2026-09-09", write("2026-09-09", "Calm"));
        verify(entryRepository, atLeastOnce()).save(captor.capture());
        assertEquals("calm", captor.getValue().getMood());
    }
}
