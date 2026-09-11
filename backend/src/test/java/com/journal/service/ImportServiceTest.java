package com.journal.service;

import com.journal.dto.ImportResponse;
import com.journal.exception.ApiException;
import com.journal.model.Entry;
import com.journal.model.User;
import com.journal.repository.EntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImportServiceTest {

    @Mock
    EntryRepository entryRepository;

    @Mock
    EntryService entryService;

    ImportService service;
    User user;

    @BeforeEach
    void setUp() {
        service = new ImportService(entryRepository, entryService);
        user = new User();
        user.setId("user-1");
        user.setTimezone("UTC");
        lenient().when(entryRepository.findByUserIdAndDate(eq("user-1"), anyString())).thenReturn(Optional.empty());
    }

    private Entry existing(String content) {
        Entry e = new Entry();
        e.setId("existing");
        e.setUserId("user-1");
        e.setDate("2026-09-09");
        e.setContent(content);
        e.setCreatedAt(Instant.now());
        e.setUpdatedAt(Instant.now());
        return e;
    }

    @Test
    void skipsDaysThatAlreadyHoldWords() {
        when(entryRepository.findByUserIdAndDate("user-1", "2026-09-09"))
                .thenReturn(Optional.of(existing("Already here.")));
        ImportResponse res = service.importFile(user, "markdown", "# 2026-09-09\n\nNew words.\n".getBytes(StandardCharsets.UTF_8));
        assertEquals(0, res.getImported());
        assertEquals(1, res.getSkipped());
        verify(entryService, never()).saveByDate(any(), any(), any());
    }

    @Test
    void rejectsBadFormatEmptyAndOversize() {
        assertThrows(ApiException.class, () -> service.importFile(user, "xml", "x".getBytes(StandardCharsets.UTF_8)));
        assertThrows(ApiException.class, () -> service.importFile(user, "json", new byte[0]));
        assertThrows(ApiException.class, () -> service.importFile(user, "json", new byte[(int) ImportService.MAX_BYTES + 1]));
    }
}
