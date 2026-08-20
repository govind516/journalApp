const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

function base64Encode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64Decode(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function deriveSaltFromUsername(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const salt = new Uint8Array(SALT_LENGTH);
  const view = new DataView(salt.buffer);
  view.setInt32(0, hash);
  view.setInt32(4, hash ^ 0xdeadbeef);
  view.setInt32(8, hash ^ 0xcafebabe);
  view.setInt32(12, hash ^ 0x12345678);
  return salt;
}

async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext, password, username) {
  if (!plaintext || plaintext.trim() === '') return '';

  const salt = deriveSaltFromUsername(username);
  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  return `${base64Encode(salt)}:${base64Encode(iv)}:${base64Encode(ciphertext)}`;
}

export async function decrypt(encryptedStr, password, username) {
  if (!encryptedStr || encryptedStr.trim() === '') return '';

  const parts = encryptedStr.split(':');
  if (parts.length !== 3) return encryptedStr;

  try {
    const salt = new Uint8Array(base64Decode(parts[0]));
    const iv = new Uint8Array(base64Decode(parts[1]));
    const ciphertext = base64Decode(parts[2]);

    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return '[Decryption failed — wrong password or corrupted data]';
  }
}

export function isEncrypted(str) {
  if (!str) return false;
  const parts = str.split(':');
  return parts.length === 3;
}
