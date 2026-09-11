import { toast } from "sonner";
import { apiGet, apiPut } from "./api";
import { saveDraft } from "./drafts";
import { queryClient } from "./queryClient";
import { toEntry } from "./normalize";
import type { Entry, EntryPayload } from "./types";

const QUEUE_KEY = "journal-write-queue";

export interface QueuedWrite {
  payload: EntryPayload;
  /** Server snapshot the edit started from; null when the day looked empty. */
  base: { content: string; updatedAt: string } | null;
  queuedAt: number;
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notify() {
  for (const listener of listeners) listener();
}

export function loadQueue(): QueuedWrite[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storeQueue(queue: QueuedWrite[]) {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch { /* quota — oldest writes still attempted first */ }
  notify();
}

export function queuedCount(): number {
  return loadQueue().length;
}

export function enqueueWrite(payload: EntryPayload, base: QueuedWrite["base"]) {
  const queue = loadQueue().filter((q) => q.payload.date !== payload.date);
  queue.push({ payload, base, queuedAt: Date.now() });
  storeQueue(queue);
}

function isNewer(a: string, b: string): boolean {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  return Number.isFinite(ta) && Number.isFinite(tb) && ta > tb;
}

/**
 * Flushes queued writes oldest-first. Conflict-safe: when the server page
 * changed underneath the queued edit, the server wins and the queued words
 * are preserved as a local draft — nothing is ever silently overwritten.
 */
export async function flushQueue(): Promise<{ flushed: number; conflicts: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { flushed: 0, conflicts: 0 };
  let queue = loadQueue();
  let flushed = 0;
  let conflicts = 0;
  const remaining: QueuedWrite[] = [];

  for (const item of queue) {
    try {
      let server: Entry | null = null;
      try {
        server = await apiGet<Record<string, unknown>>(`/entries/date/${item.payload.date}`).then((raw) => (raw ? toEntry(raw) : null));
      } catch (e) {
        if ((e as { status?: number })?.status !== 404) throw e;
      }
      const serverChanged =
        !!server?.content?.trim() &&
        (!item.base || (isNewer(server.updated_at, item.base.updatedAt) && server.content !== item.base.content));
      if (serverChanged && server) {
        saveDraft(item.payload.date, { content: item.payload.content, mood: item.payload.mood, tags: item.payload.tags });
        conflicts += 1;
        continue;
      }
      await apiPut(`/entries/date/${item.payload.date}`, item.payload);
      flushed += 1;
    } catch {
      // Still offline or server hiccup — keep the rest for next time.
      remaining.push(item);
      const idx = queue.indexOf(item);
      remaining.push(...queue.slice(idx + 1));
      break;
    }
  }

  storeQueue(remaining);
  if (flushed > 0 || conflicts > 0) {
    queryClient.invalidateQueries({ queryKey: ["today"] });
    queryClient.invalidateQueries({ queryKey: ["entries"] });
    queryClient.invalidateQueries({ queryKey: ["insights"] });
  }
  if (flushed > 0 && conflicts === 0) {
    toast("Saved what waited.", { description: flushed === 1 ? "One page went through." : `${flushed} pages went through.` });
  } else if (conflicts > 0) {
    toast("Kept the newer server page.", { description: "Your offline words wait safely as a draft." });
  }
  queue = remaining;
  return { flushed, conflicts };
}
