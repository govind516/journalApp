package com.journal.service;

import org.springframework.stereotype.Service;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.HexFormat;

/**
 * PBKDF2-HMAC-SHA256 password hashing, mirroring the original Python implementation
 * (210,000 iterations, 16-byte salt), stored as "<saltHex>$<digestHex>".
 */
@Service
public class PasswordService {

    private static final int ITERATIONS = 210_000;
    private static final int KEY_LENGTH_BITS = 256;
    private static final HexFormat HEX = HexFormat.of();

    public String hash(String password) {
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        byte[] digest = pbkdf2(password, salt);
        return HEX.formatHex(salt) + "$" + HEX.formatHex(digest);
    }

    public boolean verify(String password, String encoded) {
        try {
            String[] parts = encoded.split("\\$", 2);
            if (parts.length != 2) return false;
            byte[] salt = HEX.parseHex(parts[0]);
            byte[] expected = HEX.parseHex(parts[1]);
            byte[] actual = pbkdf2(password, salt);
            return constantTimeEquals(actual, expected);
        } catch (Exception ex) {
            return false;
        }
    }

    private byte[] pbkdf2(String password, byte[] salt) {
        try {
            PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, ITERATIONS, KEY_LENGTH_BITS);
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            return factory.generateSecret(spec).getEncoded();
        } catch (InvalidKeySpecException | java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private boolean constantTimeEquals(byte[] a, byte[] b) {
        if (a.length != b.length) return false;
        int result = 0;
        for (int i = 0; i < a.length; i++) result |= a[i] ^ b[i];
        return result == 0;
    }
}
