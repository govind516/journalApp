import { encrypt, decrypt, isEncrypted } from '../crypto.js';

const { describe, it } = await import('node:test');
const assert = await import('node:assert/strict');

describe('E2EE Crypto', () => {
  const password = 'my-test-password-123';
  const username = 'testuser';

  it('encrypts plaintext to ciphertext', async () => {
    const plaintext = 'Hello, this is a secret journal entry!';
    const encrypted = await encrypt(plaintext, password, username);

    assert.ok(encrypted, 'should return encrypted string');
    assert.ok(isEncrypted(encrypted), 'should be detected as encrypted');
    assert.notEqual(encrypted, plaintext, 'ciphertext should differ from plaintext');
    assert.match(encrypted, /^[^:]+:[^:]+$/, 'should have format iv:ciphertext');
  });

  it('decrypts ciphertext back to plaintext', async () => {
    const plaintext = 'My secret thoughts about today.';
    const encrypted = await encrypt(plaintext, password, username);
    const decrypted = await decrypt(encrypted, password, username);

    assert.equal(decrypted, plaintext, 'decrypted should match original');
  });

  it('different encryptions produce different ciphertext (random IV)', async () => {
    const plaintext = 'Same content encrypted twice';
    const enc1 = await encrypt(plaintext, password, username);
    const enc2 = await encrypt(plaintext, password, username);

    assert.notEqual(enc1, enc2, 'two encryptions should produce different ciphertext');
    assert.equal(await decrypt(enc1, password, username), plaintext);
    assert.equal(await decrypt(enc2, password, username), plaintext);
  });

  it('wrong password fails to decrypt', async () => {
    const plaintext = 'Protected content';
    const encrypted = await encrypt(plaintext, password, username);
    const result = await decrypt(encrypted, 'wrong-password', username);

    assert.ok(result.includes('Decryption failed'), 'should return error message');
  });

  it('wrong username fails to decrypt (different salt)', async () => {
    const plaintext = 'User-specific content';
    const encrypted = await encrypt(plaintext, password, 'user1');
    const result = await decrypt(encrypted, password, 'user2');

    assert.ok(result.includes('Decryption failed'), 'should return error message');
  });

  it('handles empty/null plaintext', async () => {
    const result1 = await encrypt('', password, username);
    assert.equal(result1, '', 'empty string should return empty');

    const result2 = await encrypt(null, password, username);
    assert.equal(result2, '', 'null should return empty');

    const result3 = await encrypt('   ', password, username);
    assert.equal(result3, '', 'whitespace-only should return empty');
  });

  it('handles empty/null ciphertext', async () => {
    const result1 = await decrypt('', password, username);
    assert.equal(result1, '', 'empty string should return empty');

    const result2 = await decrypt(null, password, username);
    assert.equal(result2, '', 'null should return empty');
  });

  it('non-encrypted string passes through', async () => {
    const result = await decrypt('plain text without colons', password, username);
    assert.equal(result, 'plain text without colons', 'non-encrypted string passes through');
  });

  it('isEncrypted detects valid format', () => {
    assert.ok(isEncrypted('abc:def'), 'should detect encrypted');
    assert.ok(!isEncrypted('plain text'), 'should not detect plain text');
    assert.ok(!isEncrypted(''), 'should not detect empty');
    assert.ok(!isEncrypted(null), 'should not detect null');
    assert.ok(!isEncrypted('onlyone'), 'should not detect single part');
  });

  it('handles unicode content', async () => {
    const plaintext = '你好世界 🌍 مرحبا';
    const encrypted = await encrypt(plaintext, password, username);
    const decrypted = await decrypt(encrypted, password, username);

    assert.equal(decrypted, plaintext, 'unicode should survive encrypt/decrypt');
  });

  it('handles long content', async () => {
    const plaintext = 'A'.repeat(10000) + ' - end of journal';
    const encrypted = await encrypt(plaintext, password, username);
    const decrypted = await decrypt(encrypted, password, username);

    assert.equal(decrypted, plaintext, 'long content should survive encrypt/decrypt');
  });
});
