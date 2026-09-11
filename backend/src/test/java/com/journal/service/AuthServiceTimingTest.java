package com.journal.service;

import com.journal.dto.LoginRequest;
import com.journal.exception.ApiException;
import com.journal.model.User;
import com.journal.repository.EntryRepository;
import com.journal.repository.SessionRepository;
import com.journal.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Timing-oracle contract for {@code AuthService.login()}: the no-such-user
 * path must do the same observable work as the wrong-password path. No
 * wall-clock assertions — flaky by construction — only path execution and
 * identical failure output.
 */
class AuthServiceTimingTest {

    private static LoginRequest login(String email, String password) {
        LoginRequest request = new LoginRequest();
        request.setEmail(email);
        request.setPassword(password);
        return request;
    }

    private static AuthService service(UserRepository users, PasswordService passwords) {
        return new AuthService(users, mock(SessionRepository.class), mock(EntryRepository.class), passwords);
    }

    @Test
    void noSuchUserRunsDummyVerifyThenIdentical401() {
        UserRepository users = mock(UserRepository.class);
        PasswordService passwords = mock(PasswordService.class);
        when(users.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        ApiException missing = assertThrows(ApiException.class,
                () -> service(users, passwords).login(login("ghost@example.com", "candidate")));
        assertEquals(401, missing.getStatus());
        assertEquals("Email or password not recognised", missing.getMessage());

        ArgumentCaptor<String> hash = ArgumentCaptor.forClass(String.class);
        verify(passwords, times(1)).verify(eq("candidate"), hash.capture());
        // A single fixed, well-formed ballast — 16-byte salt hex + 32-byte digest hex.
        assertTrue(hash.getValue().matches("[0-9a-f]{32}\\$[0-9a-f]{64}"), "dummy hash must stay well-formed");

        ApiException second = assertThrows(ApiException.class,
                () -> service(users, passwords).login(login("ghost@example.com", "candidate")));
        ArgumentCaptor<String> again = ArgumentCaptor.forClass(String.class);
        verify(passwords, times(2)).verify(eq("candidate"), again.capture());
        assertEquals(hash.getValue(), again.getValue(), "ballast must be stable, not per-call random");
    }

    @Test
    void wrongPasswordFailsByteIdentically() {
        User user = new User();
        user.setPasswordHash("aa$bb");

        UserRepository missingUsers = mock(UserRepository.class);
        when(missingUsers.findByEmail("ghost@example.com")).thenReturn(Optional.empty());
        PasswordService passwords = mock(PasswordService.class);
        when(passwords.verify(anyString(), anyString())).thenReturn(false);

        ApiException missing = assertThrows(ApiException.class,
                () -> service(missingUsers, passwords).login(login("ghost@example.com", "candidate")));

        UserRepository presentUsers = mock(UserRepository.class);
        when(presentUsers.findByEmail("ada@example.com")).thenReturn(Optional.of(user));
        ApiException wrong = assertThrows(ApiException.class,
                () -> service(presentUsers, passwords).login(login("ada@example.com", "candidate")));

        assertEquals(missing.getStatus(), wrong.getStatus());
        assertEquals(missing.getMessage(), wrong.getMessage());
    }

    @Test
    void nullPasswordIs401Not500() {
        UserRepository users = mock(UserRepository.class);
        when(users.findByEmail("ghost@example.com")).thenReturn(Optional.empty());
        PasswordService passwords = new PasswordService();

        ApiException ex = assertThrows(ApiException.class,
                () -> service(users, passwords).login(login("ghost@example.com", null)));
        assertEquals(401, ex.getStatus());

        User user = new User();
        user.setPasswordHash(passwords.hash("correct-horse"));
        UserRepository presentUsers = mock(UserRepository.class);
        when(presentUsers.findByEmail("ada@example.com")).thenReturn(Optional.of(user));
        ApiException wrong = assertThrows(ApiException.class,
                () -> service(presentUsers, passwords).login(login("ada@example.com", null)));
        assertEquals(401, wrong.getStatus());
    }
}
