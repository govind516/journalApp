import { http, HttpResponse } from "msw";

export interface MockEntry {
  id: string;
  date: string;
  content: string;
  mood: string | null;
  tags: string[];
  backfilled: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface MockUser {
  id: string;
  email: string;
  name: string;
  timezone: string;
  reminderEnabled: boolean;
  reminderTime: string;
  streakAlerts: boolean;
  createdAt: string;
}

export const TODAY = "2026-09-09";

const baseUser = (): MockUser => ({
  id: "user-1",
  email: "demo@journal.local",
  name: "Demo Writer",
  timezone: "UTC",
  reminderEnabled: false,
  reminderTime: "20:00",
  streakAlerts: true,
  createdAt: "2026-09-01T00:00:00Z",
});

const seedEntries = (): MockEntry[] => [
  {
    id: "entry-1",
    date: TODAY,
    content:
      "I noticed the light on the kitchen floor this morning. Nothing important was happening, which might be why I finally noticed it. A quiet start, tea going cold while I watched the dust turn in the sunbeam, and for once I did not reach for the phone to fill the minute.",
    mood: "grateful",
    tags: ["morning"],
    backfilled: false,
    createdAt: "2026-09-09T07:00:00Z",
    updatedAt: "2026-09-09T07:00:00Z",
    userId: "user-1",
  },
  {
    id: "entry-2",
    date: "2026-09-07",
    content: "A good day at the desk. The work problem finally landed.",
    mood: "calm",
    tags: ["work"],
    backfilled: false,
    createdAt: "2026-09-07T07:00:00Z",
    updatedAt: "2026-09-07T07:00:00Z",
    userId: "user-1",
  },
  {
    id: "entry-3",
    date: "2026-08-16",
    content: "Too many tabs open. The deadline moved and my stomach moved with it.",
    mood: "restless",
    tags: ["work", "deadlines"],
    backfilled: false,
    createdAt: "2026-08-16T07:00:00Z",
    updatedAt: "2026-08-16T07:00:00Z",
    userId: "user-1",
  },
  {
    id: "entry-4",
    date: "2025-09-09",
    content: "One year ago today: boxes everywhere, takeout on the floor.",
    mood: "calm",
    tags: ["anniversary"],
    backfilled: true,
    createdAt: "2025-09-09T07:00:00Z",
    updatedAt: "2025-09-09T07:00:00Z",
    userId: "user-1",
  },
];

export const db = {
  users: [baseUser()] as MockUser[],
  sessions: new Map<string, string>(),
  entries: seedEntries() as MockEntry[],
};

export function resetDb() {
  db.users = [baseUser()];
  db.sessions = new Map([["test-token", "user-1"]]);
  db.entries = seedEntries();
}

function authedUser(req: Request): MockUser | null {
  // Deterministic test channel only. The jsdom/MSW stack keeps its own
  // persistent cookie jar that cannot be reliably cleared between tests,
  // so ambient Cookie headers must never authenticate here. Real cookie
  // behavior is covered against the live backend instead.
  const testUser = req.headers.get("x-test-user");
  if (testUser) return db.users.find((u) => u.id === testUser) ?? null;
  return null;
}

const entryJson = (e: MockEntry) => ({
  id: e.id,
  date: e.date,
  content: e.content,
  mood: e.mood,
  tags: e.tags,
  backfilled: e.backfilled,
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
});

const userJson = (u: MockUser) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  timezone: u.timezone,
  reminderEnabled: u.reminderEnabled,
  reminderTime: u.reminderTime,
  streakAlerts: u.streakAlerts,
  createdAt: u.createdAt,
});

export const handlers = [
  http.post("/api/auth/signup", async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;
    if (db.users.some((u) => u.email === body.email)) {
      return HttpResponse.json({ detail: "An account with that email already exists" }, { status: 409 });
    }
    const user: MockUser = {
      id: `user-${db.users.length + 1}`,
      email: body.email,
      name: body.name,
      timezone: body.timezone ?? "UTC",
      reminderEnabled: false,
      reminderTime: "20:00",
      streakAlerts: true,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    db.sessions.set("test-token", user.id);
    return HttpResponse.json(userJson(user), { headers: { "Set-Cookie": "journal_session=test-token; Path=/" } });
  }),

  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;
    const user = db.users.find((u) => u.email === body.email);
    if (!user || body.password !== "password123") {
      return HttpResponse.json({ detail: "Email or password not recognised" }, { status: 401 });
    }
    db.sessions.set("test-token", user.id);
    return HttpResponse.json(userJson(user), { headers: { "Set-Cookie": "journal_session=test-token; Path=/" } });
  }),

  http.post("/api/auth/logout", () => {
    db.sessions.delete("test-token");
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/auth/me", ({ request }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    return HttpResponse.json(userJson(user));
  }),

  http.get("/api/entries/today", ({ request }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    const entry = db.entries.find((e) => e.userId === user.id && e.date === TODAY);
    return HttpResponse.json({ date: TODAY, entry: entry ? entryJson(entry) : null });
  }),

  http.get("/api/entries/date/:date", ({ request, params }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    const entry = db.entries.find((e) => e.userId === user.id && e.date === params.date);
    if (!entry) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    return HttpResponse.json(entryJson(entry));
  }),

  http.put("/api/entries/date/:date", async ({ request, params }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    const body = (await request.json()) as Record<string, unknown>;
    if (body.date !== params.date) {
      return HttpResponse.json({ detail: "Entry date does not match the URL" }, { status: 400 });
    }
    let entry = db.entries.find((e) => e.userId === user.id && e.date === params.date);
    if (!entry) {
      entry = {
        id: `entry-${db.entries.length + 1}`,
        date: String(params.date),
        content: "",
        mood: null,
        tags: [],
        backfilled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: user.id,
      };
      db.entries.push(entry);
    }
    entry.content = String(body.content ?? "");
    entry.mood = (body.mood as string) ?? null;
    entry.tags = Array.isArray(body.tags) ? (body.tags as string[]) : [];
    entry.backfilled = Boolean(body.backfilled);
    entry.updatedAt = new Date().toISOString();
    return HttpResponse.json(entryJson(entry));
  }),

  http.get("/api/entries", ({ request }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").toLowerCase();
    const tag = (url.searchParams.get("tag") ?? "").toLowerCase();
    const mood = url.searchParams.get("mood") ?? "";
    const limit = Math.min(200, Number(url.searchParams.get("limit") ?? 100));
    let list = db.entries.filter((e) => e.userId === user.id).sort((a, b) => (a.date < b.date ? 1 : -1));
    if (search) list = list.filter((e) => e.content.toLowerCase().includes(search));
    if (tag) list = list.filter((e) => e.tags.includes(tag));
    if (mood) list = list.filter((e) => e.mood === mood);
    return HttpResponse.json(list.slice(0, limit).map(entryJson));
  }),

  http.get("/api/entries/calendar/:year", ({ request, params }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    const days = db.entries
      .filter((e) => e.userId === user.id && e.date.startsWith(`${params.year}-`) && e.content.trim())
      .map((e) => ({ date: e.date, words: e.content.trim().split(/\s+/).length, entryId: e.id }));
    return HttpResponse.json({ year: Number(params.year), days });
  }),

  http.get("/api/entries/on-this-day/:date", ({ request, params }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    const target = String(params.date);
    const list = db.entries.filter(
      (e) => e.userId === user.id && e.date.length === 10 && e.date.slice(4) === target.slice(4) && e.date !== target
    );
    return HttpResponse.json(list.map(entryJson));
  }),

  http.get("/api/entries/:id", ({ request, params }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    const entry = db.entries.find((e) => e.id === params.id && e.userId === user.id);
    if (!entry) return HttpResponse.json({ detail: "Entry not found" }, { status: 404 });
    return HttpResponse.json(entryJson(entry));
  }),

  http.delete("/api/entries/:id", ({ request, params }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    const index = db.entries.findIndex((e) => e.id === params.id && e.userId === user.id);
    if (index < 0) return HttpResponse.json({ detail: "Entry not found" }, { status: 404 });
    db.entries.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/insights", ({ request }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    const mine = db.entries.filter((e) => e.userId === user.id && e.content.trim());
    return HttpResponse.json({
      currentStreak: 2,
      longestStreak: 2,
      totalEntries: mine.length,
      writingDays: mine.length,
      moodCounts: { calm: 2, grateful: 1 },
      moodPoints: mine.map((e) => ({ date: e.date, mood: e.mood })),
      tagCounts: [{ tag: "work", count: 2 }],
      badges: [
        { name: "First Ink", description: "Write your first reflection", unlocked: mine.length >= 1 },
        { name: "3-Day Rhythm", description: "Write on three consecutive days", unlocked: false },
      ],
    });
  }),

  http.get("/api/memory", ({ request }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    return HttpResponse.json({
      signals: [
        { kind: "phrase", title: "“light” keeps returning", detail: "You have written about it 3 times.", entryIds: ["entry-1"] },
        { kind: "tag", title: "#work is a thread", detail: "2 pages carry this thread.", entryIds: ["entry-2", "entry-3"] },
      ],
    });
  }),

  http.post("/api/ask", async ({ request }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    const body = (await request.json()) as Record<string, string>;
    const question = (body.question ?? "").trim();
    if (!question) return HttpResponse.json({ detail: "Ask something first — a question, a word, anything." }, { status: 400 });
    if (question.includes("zzz-nothing")) {
      return HttpResponse.json({ answer: "I searched every page and found nothing.", entries: [], source: "local" });
    }
    return HttpResponse.json({
      answer: "The brightest pages I can find are these. September 9 seems to hold the most light.",
      entries: [{ id: "entry-1", date: TODAY, excerpt: "I noticed the light on the kitchen floor…", mood: "grateful" }],
      source: "local",
    });
  }),

  http.get("/api/reflection/:month", ({ request, params }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    if (!/^\d{4}-\d{2}$/.test(String(params.month))) {
      return HttpResponse.json({ detail: "Use a valid YYYY-MM month" }, { status: 400 });
    }
    const mine = db.entries.filter((e) => e.userId === user.id && e.date.startsWith(String(params.month)) && e.content.trim());
    return HttpResponse.json({
      month: params.month,
      title: "Your September",
      entries: mine.length,
      writingDays: mine.length,
      topMood: "grateful",
      topTags: [{ tag: "morning", count: 1 }],
      longestEntryId: "entry-1",
      longestEntryDate: TODAY,
      longestWords: 42,
      narrative: "September held pages across days. The prevailing feeling was grateful.",
    });
  }),

  http.post("/api/import", async ({ request }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    const body = (await request.json()) as Record<string, string>;
    const format = String(body.format ?? "");
    if (!["markdown", "md", "json", "csv", "dayone"].includes(format)) {
      return HttpResponse.json({ detail: "Choose markdown, json, csv or dayone" }, { status: 400 });
    }
    let text = "";
    try {
      text = Buffer.from(body.contentBase64 ?? "", "base64").toString("utf-8");
    } catch {
      return HttpResponse.json({ detail: "The file content is not valid base64" }, { status: 400 });
    }
    if (!text.trim()) return HttpResponse.json({ detail: "The file is empty" }, { status: 400 });
    if (format === "dayone") {
      db.entries.push({
        id: "entry-imported-1", date: "2026-09-05", content: "Imported words.", mood: null,
        tags: ["travel"], backfilled: true, createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), userId: user.id,
      });
      return HttpResponse.json({ imported: 2, skipped: 1, errors: ["Entry 3: invalid creationDate, skipped"] });
    }
    return HttpResponse.json({ imported: 1, skipped: 0, errors: [] });
  }),

  http.get("/api/reminders/unsubscribe", ({ request }) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    if (token === "good-token") {
      const user = db.users.find((u) => u.id === "user-1");
      if (user) user.reminderEnabled = false;
      return HttpResponse.json({ ok: true });
    }
    return HttpResponse.json({ detail: "This link is invalid or expired" }, { status: 400 });
  }),

  http.patch("/api/settings", async ({ request }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.name === "string") user.name = body.name;
    if (typeof body.timezone === "string") user.timezone = body.timezone;
    if (typeof body.reminderEnabled === "boolean") user.reminderEnabled = body.reminderEnabled;
    if (typeof body.reminderTime === "string") user.reminderTime = body.reminderTime;
    if (typeof body.streakAlerts === "boolean") user.streakAlerts = body.streakAlerts;
    return HttpResponse.json(userJson(user));
  }),

  http.delete("/api/account", ({ request }) => {
    const user = authedUser(request);
    if (!user) return HttpResponse.json({ detail: "Please sign in to continue" }, { status: 401 });
    db.entries = db.entries.filter((e) => e.userId !== user.id);
    db.users = db.users.filter((u) => u.id !== user.id);
    db.sessions.delete("test-token");
    return new HttpResponse(null, { status: 204 });
  }),
];
