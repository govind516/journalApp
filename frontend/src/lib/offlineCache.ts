/**
 * Small durable read cache: successful reads of journal content are mirrored
 * to localStorage so Today and Timeline still open offline. TTL-guarded and
 * quota-safe. Invalidation still flows through React Query on every save.
 */

const STORE_KEY = "journal-cache-v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const CACHEABLE = ["today", "entries", "entry", "on-this-day", "calendar", "insights", "memory", "reflection", "me"];

export function isCacheable(queryKey: unknown): boolean {
  return Array.isArray(queryKey) && typeof queryKey[0] === "string" && CACHEABLE.includes(queryKey[0]);
}

interface Snapshot {
  data: unknown;
  ts: number;
}

function readStore(): Record<string, Snapshot> {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Snapshot>) : {};
  } catch {
    return {};
  }
}

export function loadSnapshot(queryKey: unknown): unknown | undefined {
  if (!isCacheable(queryKey)) return undefined;
  const snap = readStore()[JSON.stringify(queryKey)];
  if (!snap || Date.now() - snap.ts > CACHE_TTL_MS) return undefined;
  return snap.data;
}

export function saveSnapshot(queryKey: unknown, data: unknown) {
  if (!isCacheable(queryKey) || data === undefined) return;
  try {
    const store = readStore();
    store[JSON.stringify(queryKey)] = { data, ts: Date.now() };
    // Keep the cache small: newest 60 entries win.
    const keys = Object.keys(store);
    if (keys.length > 60) {
      const oldest = keys.sort((a, b) => store[a].ts - store[b].ts).slice(0, keys.length - 60);
      for (const key of oldest) delete store[key];
    }
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch { /* quota or private mode — cache is a nicety, not a promise */ }
}
