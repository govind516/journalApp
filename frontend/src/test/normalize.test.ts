import { describe, expect, it } from "vitest";
import {
  toAsk,
  toCalendar,
  toEntries,
  toInsights,
  toMemory,
  toReflection,
  toSettingsBody,
  toToday,
  toUser,
} from "@/lib/normalize";

describe("API boundary (camelCase in, UI model out)", () => {
  it("maps a user", () => {
    expect(
      toUser({ id: "1", email: "a@b.c", name: "A", timezone: "UTC", reminderEnabled: true, reminderTime: "21:00", streakAlerts: false, createdAt: "x" })
    ).toMatchObject({ reminder_enabled: true, reminder_time: "21:00", streak_alerts: false });
  });

  it("maps an entry list", () => {
    expect(toEntries([{ id: "e", date: "2026-09-09", content: "hi", mood: null, tags: [], backfilled: false, createdAt: "x", updatedAt: "y" }])).toMatchObject([
      { id: "e", created_at: "x", updated_at: "y" },
    ]);
    expect(toEntries(null)).toEqual([]);
  });

  it("maps insights without silent undefineds", () => {
    const out = toInsights({
      currentStreak: 3, longestStreak: 5, totalEntries: 9, writingDays: 8,
      moodCounts: { calm: 4 }, moodPoints: [{ date: "2026-09-09", mood: "calm" }],
      tagCounts: [{ tag: "work", count: 2 }],
      badges: [{ name: "First Ink", description: "d", unlocked: true }],
    });
    expect(out.current_streak).toBe(3);
    expect(out.mood_points).toEqual([{ date: "2026-09-09", mood: "calm" }]);
    expect(out.tag_counts).toEqual([{ tag: "work", count: 2 }]);
  });

  it("maps calendar entry ids and today payloads", () => {
    expect(toCalendar({ year: 2026, days: [{ date: "2026-09-09", words: 12, entryId: "e1" }] }).days[0].entry_id).toBe("e1");
    expect(toToday({ date: "2026-09-09", entry: null })).toEqual({ date: "2026-09-09", entry: null });
  });

  it("maps memory, ask and reflection", () => {
    expect(toMemory({ signals: [{ kind: "tag", title: "t", detail: "d", entryIds: ["e"] }] }).signals[0].entryIds).toEqual(["e"]);
    expect(toAsk({ answer: "a", entries: [{ id: "e", date: "d", excerpt: "x", mood: null }], source: "local" }).source).toBe("local");
    expect(toReflection({ month: "2026-09", title: "Your September", entries: 2, writingDays: 2, topMood: null, topTags: [], longestEntryId: null, longestEntryDate: null, longestWords: 0, narrative: "n" }).entries).toBe(2);
  });

  it("sends settings back in camelCase", () => {
    expect(toSettingsBody({ reminder_enabled: true, reminder_time: "21:30" })).toEqual({ reminderEnabled: true, reminderTime: "21:30" });
  });
});
