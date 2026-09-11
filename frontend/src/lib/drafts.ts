/** Unsent-words drafts shared by the editor and the offline sync queue. */

export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const draftKey = (date: string) => `journal-draft-${date}`;

export interface Draft {
  content: string;
  mood: string | null;
  tags: string[];
  updatedAt: number;
}

export function loadDraft(date: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(date));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    // Old drafts fade away — a month-old half-thought shouldn't ambush you.
    if (!draft.updatedAt || Date.now() - draft.updatedAt > DRAFT_TTL_MS) {
      window.localStorage.removeItem(draftKey(date));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function saveDraft(date: string, draft: Omit<Draft, "updatedAt">) {
  try {
    window.localStorage.setItem(draftKey(date), JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch { /* private mode or quota */ }
}

export function clearDraft(date: string) {
  try { window.localStorage.removeItem(draftKey(date)); } catch { /* private mode */ }
}

export function sweepStaleDrafts() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("journal-draft-")) keys.push(key);
    }
    for (const key of keys) {
      const raw = window.localStorage.getItem(key);
      try {
        const draft = raw ? (JSON.parse(raw) as Draft) : null;
        if (!draft?.updatedAt || Date.now() - draft.updatedAt > DRAFT_TTL_MS) window.localStorage.removeItem(key);
      } catch {
        window.localStorage.removeItem(key);
      }
    }
  } catch { /* private mode */ }
}
