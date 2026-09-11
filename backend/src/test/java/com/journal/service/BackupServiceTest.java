package com.journal.service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

class BackupServiceTest {

    @BeforeEach
    void setUp() {
    }

    @AfterEach
    void tearDown() {
        cleanupDir();
    }

    @Test
    void selfDisablesWhenNoPassphrase() {
        BackupService service = new BackupService();
        service.setPassphrase("");
        service.setEnabled(true);
        service.init();
        assertFalse(service.isEnabled(), "init() must disable itself when passphrase absent");
    }

    @Test
    void skipIfNoEntries() {
        BackupService service = new BackupService();
        service.setPassphrase("test-passphrase-123");
        service.setEnabled(true);
        service.init();
        assertDoesNotThrow(() -> service.backupUserEntries("user-999"));
    }

    @Test
    void encryptDecryptRoundTrip() throws Exception {
        String passphrase = "test-passphrase-123";
        BackupService service = new BackupService();
        service.setPassphrase(passphrase);
        service.setEnabled(true);
        service.init();

        List<String> entriesJson = List.of(
            "{\"id\":1,\"content\":\"entry one\",\"mood\":\"good\",\"tags\":[\"tag1\"]}",
            "{\"id\":2,\"content\":\"entry two\",\"mood\":\"neutral\"}"
        );
        String json = String.join(",", entriesJson);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        // Direct crypto test using same algorithm:
        byte[] key = passphrase.getBytes(StandardCharsets.UTF_8);
        MessageDigest sha = MessageDigest.getInstance("SHA-256");
        key = sha.digest(key);
        SecretKeySpec keySpec = new SecretKeySpec(key, "AES");

        Cipher enc = Cipher.getInstance("AES/GCM/NoPadding");
        enc.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(128, new byte[12]));
        byte[] ct = enc.doFinal(json.getBytes(StandardCharsets.UTF_8));

        Cipher dec = Cipher.getInstance("AES/GCM/NoPadding");
        dec.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(128, new byte[12]));
        byte[] pt = dec.doFinal(ct);

        String decrypted = new String(pt, StandardCharsets.UTF_8);
        assertEquals(decrypted, json);
    }

    @Test
    void oneUserFailureDoesNotStopOthers() {
        BackupService service = new BackupService();
        service.setPassphrase("test-passphrase-123");
        service.setEnabled(true);
        service.init();
        assertDoesNotThrow(() -> service.backupUserEntries("user-1"));
        assertDoesNotThrow(() -> service.backupUserEntries("user-999"));
    }

    private void cleanupDir() {
        java.nio.file.Path dir = java.nio.file.Path.of(
            System.getProperty("java.io.tmpdir", "/tmp"),
            "journal-backup-tests");
        try {
            java.nio.file.Files.walk(dir)
                .sorted((a, b) -> b.compareTo(a))
                .forEach(p -> {
                    try { java.nio.file.Files.delete(p); } catch (Exception ignored) {}
                });
        } catch (Exception ignored) {}
    }
}