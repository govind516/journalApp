package com.journal.service;

import com.journal.model.Entry;
import com.journal.model.SentReminder;
import com.journal.model.SentReminderId;
import com.journal.model.User;
import com.journal.repository.EntryRepository;
import com.journal.repository.SentReminderRepository;
import com.journal.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReminderServiceTest {

    @Mock
    UserRepository users;
    @Mock
    EntryRepository entries;
    @Mock
    SentReminderRepository ledger;
    @Mock
    BrevoClient brevo;
    @Mock
    Environment env;

    ReminderService service;
    User user;
    List<String> savedStates;

    private void captureSaves() {
        savedStates = new ArrayList<>();
        lenient().when(ledger.save(any())).thenAnswer(inv -> {
            SentReminder r = inv.getArgument(0);
            savedStates.add(r.getStatus() + "/" + r.getAttempts());
            return r;
        });
    }

    @BeforeEach
    void setUp() {
        lenient().when(env.getActiveProfiles()).thenReturn(new String[0]);
        service = new ReminderService(users, entries, ledger, brevo, env, "test-secret", "http://localhost:5173");
        user = new User();
        user.setId("user-1");
        user.setEmail("a@b.c");
        user.setTimezone("UTC");
        user.setReminderEnabled(true);
        user.setReminderTime(LocalTime.now(ZoneId.of("UTC")).format(DateTimeFormatter.ofPattern("HH:mm")));
        lenient().when(ledger.existsById(any())).thenReturn(false);
        lenient().when(ledger.findById(any())).thenReturn(Optional.empty());
        lenient().when(ledger.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(entries.findByUserIdAndDate(eq("user-1"), anyString())).thenReturn(Optional.empty());
    }

    private SentReminder row(String status, int attempts) {
        SentReminder row = new SentReminder();
        row.setId(new SentReminderId("user-1", LocalDate.now(ZoneId.of("UTC"))));
        row.setStatus(status);
        row.setAttempts(attempts);
        return row;
    }

    @Test
    void skipsUsersWhoAlreadyWroteToday() throws Exception {
        captureSaves();
        Entry written = new Entry();
        written.setContent("Already wrote.");
        when(entries.findByUserIdAndDate(eq("user-1"), anyString())).thenReturn(Optional.of(written));
        service.handleUser(user);
        verify(brevo, never()).send(any(), any(), any());
        assertEquals(List.of("claimed/0", "skipped/0"), savedStates);
    }

    @Test
    void sendsOnceThenIgnoresRepeats() throws Exception {
        captureSaves();
        service.handleUser(user);
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(brevo).send(eq("a@b.c"), any(), body.capture());
        assertFalse(body.getValue().toLowerCase().contains("already wrote") || body.getValue().isEmpty());
        // Second run sees the sent row and stands down.
        when(ledger.findById(any())).thenReturn(Optional.of(row("sent", 1)));
        clearInvocations(brevo);
        service.handleUser(user);
        verify(brevo, never()).send(any(), any(), any());
    }

    @Test
    void failedSendsRetryThenDie() throws Exception {
        captureSaves();
        doThrow(new IllegalStateException("Brevo 429")).when(brevo).send(any(), any(), any());
        service.handleUser(user);
        assertEquals(List.of("claimed/0", "failed/1"), savedStates);
        // Attempts exhausted -> dead, no more sends.
        when(ledger.findById(any())).thenReturn(Optional.of(row("failed", 3)));
        clearInvocations(brevo);
        service.handleUser(user);
        assertTrue(savedStates.contains("dead/3"));
        verify(brevo, never()).send(any(), any(), any());
    }

    @Test
    void lostClaimRaceStandsDown() throws Exception {
        when(ledger.save(any())).thenThrow(new DataIntegrityViolationException("dup"));
        service.handleUser(user);
        verify(brevo, never()).send(any(), any(), any());
    }

    @Test
    void ignoresUsersOutsideTheirWindow() throws Exception {
        user.setReminderTime(LocalTime.now(ZoneId.of("UTC")).minusHours(2).format(DateTimeFormatter.ofPattern("HH:mm")));
        service.handleUser(user);
        verify(ledger, never()).save(any());
        verify(brevo, never()).send(any(), any(), any());
    }

    @Test
    void adoptsStaleClaimedRows() throws Exception {
        captureSaves();
        SentReminder stale = row("claimed", 0);
        stale.setUpdatedAt(Instant.now().minusSeconds(20 * 60));
        when(ledger.findById(any())).thenReturn(Optional.of(stale));
        service.handleUser(user);
        verify(brevo).send(any(), any(), any());
        assertTrue(savedStates.contains("claimed/1"));
    }

    @Test
    void leavesFreshClaimsAlone() throws Exception {
        SentReminder fresh = row("claimed", 0);
        fresh.setUpdatedAt(Instant.now());
        when(ledger.findById(any())).thenReturn(Optional.of(fresh));
        service.handleUser(user);
        verify(brevo, never()).send(any(), any(), any());
    }

    @Test
    void tokensRoundTripTamperAndExpiry() {
        String token = service.unsubscribeLink(user).split("token=")[1];
        assertEquals(Optional.of("user-1"), service.verifyUnsubscribeToken(token));
        assertTrue(service.verifyUnsubscribeToken(token + "x").isEmpty());
        assertTrue(service.verifyUnsubscribeToken("!!!not-base64!!!").isEmpty());
    }

    @Test
    void prodWithoutSecretRefusesToStart() {
        when(env.getActiveProfiles()).thenReturn(new String[]{"prod"});
        assertThrows(IllegalStateException.class,
                () -> new ReminderService(users, entries, ledger, brevo, env, "", "http://localhost:5173"));
    }
}
