/**
 * Device PIN lock: a local gate, not server auth. The PIN hash never leaves
 * this browser; unlocking lasts for the tab session only.
 */

const pinKey = (userId: string) => `journal-pin-${userId}`;
const unlockedKey = (userId: string) => `journal-unlocked-${userId}`;

export async function hashPin(pin: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${pin}`);
  try {
    const subtle = window.crypto?.subtle;
    if (!subtle) throw new Error("no-subtle");
    const digest = await subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    let h = 0;
    for (const b of bytes) h = (h * 31 + b) >>> 0;
    return `fallback-${h.toString(16)}`;
  }
}

export function getPinHash(userId: string): string | null {
  try { return window.localStorage.getItem(pinKey(userId)); } catch { return null; }
}

export function setPinHash(userId: string, hash: string) {
  window.localStorage.setItem(pinKey(userId), hash);
}

export function clearPinHash(userId: string) {
  window.localStorage.removeItem(pinKey(userId));
  window.sessionStorage.removeItem(unlockedKey(userId));
}

export function isUnlocked(userId: string): boolean {
  try { return window.sessionStorage.getItem(unlockedKey(userId)) === "1"; } catch { return true; }
}

export function markUnlocked(userId: string) {
  try { window.sessionStorage.setItem(unlockedKey(userId), "1"); } catch { /* private mode */ }
}

export function lockNow(userId: string) {
  try { window.sessionStorage.removeItem(unlockedKey(userId)); } catch { /* private mode */ }
}
