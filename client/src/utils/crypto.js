const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 100000;
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

async function deriveKey(password, username) {
  const encoder = new TextEncoder();
  const saltInput = encoder.encode('journalapp-salt:' + username);
  const saltHash = await crypto.subtle.digest('SHA-256', saltInput);
  const salt = new Uint8Array(saltHash).slice(0, 16);

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

  const key = await deriveKey(password, username);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  return `${base64Encode(iv)}:${base64Encode(ciphertext)}`;
}

export async function decrypt(encryptedStr, password, username) {
  if (!encryptedStr || encryptedStr.trim() === '') return '';

  const parts = encryptedStr.split(':');
  if (parts.length !== 2) return encryptedStr;

  try {
    const iv = new Uint8Array(base64Decode(parts[0]));
    const ciphertext = base64Decode(parts[1]);

    const key = await deriveKey(password, username);
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
  return parts.length === 2;
}
