package com.journal.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordServiceTest {

    private final PasswordService passwords = new PasswordService();

    @Test
    void roundTrip() {
        String encoded = passwords.hash("correct-horse");
        assertTrue(passwords.verify("correct-horse", encoded));
        assertFalse(passwords.verify("wrong-horse", encoded));
    }

    @Test
    void nullInputsAreFalseNeverThrow() {
        assertFalse(passwords.verify(null, "aa$bb"));
        assertFalse(passwords.verify("candidate", null));
        assertFalse(passwords.verify(null, null));
    }

    @Test
    void malformedStoredHashIsFalse() {
        assertFalse(passwords.verify("candidate", "not-a-hash"));
        assertFalse(passwords.verify("candidate", ""));
    }
}
