export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
  reminder_enabled: boolean;
  reminder_time: string;
  streak_alerts: boolean;
  created_at: string;
}

export interface Entry {
  id: string;
  date: string;
  content: string;
  mood: string | null;
  tags: string[];
  backfilled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TodayResponse {
  date: string;
  entry: Entry | null;
}

export interface EntryPayload {
  date: string;
  content: string;
  mood: string | null;
  tags: string[];
  backfilled: boolean;
}

export interface CalendarDay {
  date: string;
  words: number;
  entry_id: string;
}

export interface CalendarResponse {
  year: number;
  days: CalendarDay[];
}

export interface MoodPoint {
  date: string;
  mood: string;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface BadgeData {
  name: string;
  description: string;
  unlocked: boolean;
}

export interface MemorySignal {
  kind: string;
  title: string;
  detail: string;
  entryIds: string[];
}

export interface MemoryResponse {
  signals: MemorySignal[];
}

export interface AskEntry {
  id: string;
  date: string;
  excerpt: string;
  mood: string | null;
}

export interface AskResponse {
  answer: string;
  entries: AskEntry[];
  source: string;
}

export interface MonthReflection {
  month: string;
  title: string;
  entries: number;
  writingDays: number;
  topMood: string | null;
  topTags: TagCount[];
  longestEntryId: string | null;
  longestEntryDate: string | null;
  longestWords: number;
  narrative: string;
}

export interface Insights {
  current_streak: number;
  longest_streak: number;
  total_entries: number;
  writing_days: number;
  mood_counts: Record<string, number>;
  mood_points: MoodPoint[];
  tag_counts: TagCount[];
  badges: BadgeData[];
}

export interface SettingsPayload {
  name?: string;
  timezone?: string;
  reminder_enabled?: boolean;
  reminder_time?: string;
  streak_alerts?: boolean;
}

export const MOODS = [
  { value: "calm", emoji: "☁️", label: "Calm" },
  { value: "pensive", emoji: "◌", label: "Pensive" },
  { value: "inspired", emoji: "✦", label: "Inspired" },
  { value: "restless", emoji: "〰", label: "Restless" },
  { value: "grateful", emoji: "♡", label: "Grateful" },
] as const;

export const moodLabel = (value: string | null) =>
  MOODS.find((mood) => mood.value === value) ?? null;
