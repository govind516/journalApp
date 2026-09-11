package com.journal.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import com.journal.repository.EntryRepository;
import com.journal.model.Entry;

import jakarta.persistence.PersistenceContext;
import jakarta.persistence.EntityManager;

@Service
public class BackupService {

    private static final Logger log = LoggerFactory.getLogger(BackupService.class);

    @Value("${backup.passphrase:}")
    String passphrase;

    @Value("${backup.dir:backups}")
    String backupDir;

    @Value("${backup.enabled:true}")
    boolean enabled;

    @Autowired
    EntryRepository entryRepository;

    transient SecretKeySpec keySpec;
    transient Cipher cipher;
    private final ObjectMapper mapper = new ObjectMapper();

    public BackupService() {
        // No-arg constructor for testing; init() will disable itself when passphrase empty
    }

    public boolean isEnabled() {
        return enabled;
    }

    void setPassphrase(String passphrase) {
        this.passphrase = passphrase;
    }

    void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    @PostConstruct
    void init() {
        if (!enabled || passphrase == null || passphrase.trim().isEmpty()) {
            log.info("Backup automation disabled — no passphrase configured; set BACKUP_PASSPHRASE env to enable");
            enabled = false;
            return;
        }
        try {
            byte[] key = passphrase.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            key = sha.digest(key);
            keySpec = new SecretKeySpec(key, "AES");
            cipher = Cipher.getInstance("AES/GCM/NoPadding");
            Path dir = Paths.get(backupDir);
            if (!Files.exists(dir)) {
                Files.createDirectories(dir);
                log.info("Backup directory created at {}", dir.toAbsolutePath());
            }
        } catch (Exception e) {
            log.error("Backup init failure", e);
            enabled = false;
        }
    }

    @Scheduled(fixedDelay = 7 * 24 * 60 * 60 * 1000L)
    public void backupAllUsers() {
        if (!enabled) {
            return;
        }
        try {
            List<String> userIds = entryRepository.findDistinctUserIds();
            for (String userId : userIds) {
                try {
                    backupUserEntries(userId);
                } catch (Exception e) {
                    log.error("Backup failed for user {}", userId, e);
                }
            }
        } catch (Exception e) {
            log.error("Backup job failed", e);
        }
    }

    public void backupUserEntries(String userId) {
        if (!enabled) {
            return;
        }
        try {
            List<Entry> entries = entryRepository.findByUserIdOrderByDateDesc(userId);
            if (entries.isEmpty()) {
                return; // nothing to back up
            }
            String zipName = "journal-" + userId.toString() + "-" + String.valueOf(System.currentTimeMillis() / 1000) + ".zip";
            Path zipPath = Paths.get(backupDir, zipName);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            try (ZipOutputStream zipos = new ZipOutputStream(baos)) {
                String json = mapper.writeValueAsString(entries);
                ZipEntry entry = new ZipEntry("entries.json");
                zipos.putNextEntry(entry);
                zipos.write(json.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                zipos.closeEntry();
            }
            byte[] iv = new byte[12];
            new SecureRandom().nextBytes(iv);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(128, iv));
            byte[] ciphertext = cipher.doFinal(baos.toByteArray());
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            output.write(iv);
            output.write(ciphertext);
            Files.write(zipPath, output.toByteArray());
            log.info("Backup written for user {} to {}", userId, zipPath);
        } catch (Exception e) {
            log.error("Backup failed for user {}", userId, e);
        }
    }
}