import { apiGet, apiPost } from "./api";
import type { AskResponse, CalendarResponse, Entry, Insights, MemoryResponse, MonthReflection, TodayResponse, User } from "./types";

/**
 * The Spring Boot API speaks camelCase; the UI model speaks snake_case.
 * These mappers are the single boundary between the two so pages never
 * have to care (and silent `undefined` stats can't happen again).
 */

type Raw = Record<string, any>;

export function toUser(raw: Raw): User {
  return {
    id: String(raw.id ?? ""),
    email: String(raw.email ?? ""),
    name: String(raw.name ?? ""),
    timezone: String(raw.timezone ?? "UTC"),
    reminder_enabled: Boolean(raw.reminderEnabled ?? false),
    reminder_time: String(raw.reminderTime ?? "20:00"),
    streak_alerts: Boolean(raw.streakAlerts ?? true),
    created_at: String(raw.createdAt ?? ""),
  };
}

export function toEntry(raw: Raw): Entry {
  return {
    id: String(raw.id ?? ""),
    date: String(raw.date ?? ""),
    content: String(raw.content ?? ""),
    mood: raw.mood ?? null,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    backfilled: Boolean(raw.backfilled ?? false),
    created_at: String(raw.createdAt ?? raw.created_at ?? ""),
    updated_at: String(raw.updatedAt ?? raw.updated_at ?? ""),
  };
}

export function toToday(raw: Raw): TodayResponse {
  return {
    date: String(raw.date ?? ""),
    entry: raw.entry ? toEntry(raw.entry) : null,
  };
}

export function toInsights(raw: Raw): Insights {
  const moodCounts: Record<string, number> = {};
  for (const [key, value] of Object.entries((raw.moodCounts ?? {}) as Record<string, unknown>)) {
    moodCounts[key] = Number(value);
  }
  return {
    current_streak: Number(raw.currentStreak ?? 0),
    longest_streak: Number(raw.longestStreak ?? 0),
    total_entries: Number(raw.totalEntries ?? 0),
    writing_days: Number(raw.writingDays ?? 0),
    mood_counts: moodCounts,
    mood_points: Array.isArray(raw.moodPoints)
      ? raw.moodPoints.map((p: Raw) => ({ date: String(p.date), mood: String(p.mood) }))
      : [],
    tag_counts: Array.isArray(raw.tagCounts)
      ? raw.tagCounts.map((t: Raw) => ({ tag: String(t.tag), count: Number(t.count) }))
      : [],
    badges: Array.isArray(raw.badges)
      ? raw.badges.map((b: Raw) => ({
          name: String(b.name),
          description: String(b.description),
          unlocked: Boolean(b.unlocked),
        }))
      : [],
  };
}

export function toCalendar(raw: Raw): CalendarResponse {
  return {
    year: Number(raw.year ?? new Date().getFullYear()),
    days: Array.isArray(raw.days)
      ? raw.days.map((d: Raw) => ({
          date: String(d.date),
          words: Number(d.words ?? 0),
          entry_id: String(d.entryId ?? d.entry_id ?? ""),
        }))
      : [],
  };
}

export function toEntries(raw: unknown): Entry[] {
  return Array.isArray(raw) ? raw.map(toEntry) : [];
}

/** UI settings form (snake_case) -> API PATCH body (camelCase). */
export function toSettingsBody(form: {
  name?: string;
  timezone?: string;
  reminder_enabled?: boolean;
  reminder_time?: string;
  streak_alerts?: boolean;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (form.name !== undefined) body.name = form.name;
  if (form.timezone !== undefined) body.timezone = form.timezone;
  if (form.reminder_enabled !== undefined) body.reminderEnabled = form.reminder_enabled;
  if (form.reminder_time !== undefined) body.reminderTime = form.reminder_time;
  if (form.streak_alerts !== undefined) body.streakAlerts = form.streak_alerts;
  return body;
}

export function toMemory(raw: Raw): MemoryResponse {
  return {
    signals: Array.isArray(raw.signals)
      ? raw.signals.map((s: Raw) => ({
          kind: String(s.kind ?? ""),
          title: String(s.title ?? ""),
          detail: String(s.detail ?? ""),
          entryIds: Array.isArray(s.entryIds) ? s.entryIds.map(String) : [],
        }))
      : [],
  };
}

// Normalized query helpers used by pages.
export const fetchMeNormalized = () => apiGet<Raw>("/auth/me").then(toUser);
export const fetchInsights = () => apiGet<Raw>("/insights").then(toInsights);
export const fetchCalendar = (year: number) => apiGet<Raw>(`/entries/calendar/${year}`).then(toCalendar);
export const fetchEntryList = (params: string) => apiGet<unknown>(`/entries${params}`).then(toEntries);
export const fetchToday = () => apiGet<Raw>("/entries/today").then(toToday);
export const fetchEntryByDate = (date: string) =>
  apiGet<unknown>(`/entries/date/${date}`).then((raw) => (raw ? toEntry(raw as Raw) : null));
export const fetchEntryById = (id: string) => apiGet<Raw>(`/entries/${id}`).then(toEntry);
export const fetchOnThisDay = (date: string) => apiGet<unknown>(`/entries/on-this-day/${date}`).then(toEntries);
export const fetchMemory = () => apiGet<Raw>("/memory").then(toMemory);

export function toAsk(raw: Raw): AskResponse {
  return {
    answer: String(raw.answer ?? ""),
    entries: Array.isArray(raw.entries)
      ? raw.entries.map((e: Raw) => ({
          id: String(e.id ?? ""),
          date: String(e.date ?? ""),
          excerpt: String(e.excerpt ?? ""),
          mood: e.mood ?? null,
        }))
      : [],
    source: String(raw.source ?? "local"),
  };
}

export const askJournal = (question: string) =>
  apiPost<Raw>("/ask", { question }).then(toAsk);

export function toReflection(raw: Raw): MonthReflection {
  return {
    month: String(raw.month ?? ""),
    title: String(raw.title ?? ""),
    entries: Number(raw.entries ?? 0),
    writingDays: Number(raw.writingDays ?? 0),
    topMood: raw.topMood ?? null,
    topTags: Array.isArray(raw.topTags)
      ? raw.topTags.map((t: Raw) => ({ tag: String(t.tag), count: Number(t.count) }))
      : [],
    longestEntryId: raw.longestEntryId ?? null,
    longestEntryDate: raw.longestEntryDate ?? null,
    longestWords: Number(raw.longestWords ?? 0),
    narrative: String(raw.narrative ?? ""),
  };
}

export const fetchReflection = (yearMonth: string) =>
  apiGet<Raw>(`/reflection/${yearMonth}`).then(toReflection);
