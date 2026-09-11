/**
 * Seeds a demo account with ~3 months of realistic entries so populated
 * states (Timeline density, Calendar heat, Insights chart, Badges) can be
 * verified against real data instead of empty screens.
 *
 * Usage: node scripts/seed.mjs [backend-origin]
 * Default backend: http://127.0.0.1:8000
 */
const BASE = process.argv[2] ?? "http://127.0.0.1:8000";
const EMAIL = "demo@journal.local";
const PASSWORD = "journaldemo123";
const NAME = "Demo Writer";

let cookie = "";
async function call(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

const ENTRIES = [
  { ago: 0, mood: "grateful", tags: ["morning"], content: "I noticed the light on the kitchen floor this morning. Nothing important was happening, which might be why I finally noticed it. A little more present than yesterday, I think." },
  { ago: 1, mood: "calm", tags: ["evening", "walk"], content: "Evening walk after dinner. The air had that end-of-summer softness. Thought about nothing much, on purpose." },
  { ago: 2, mood: "inspired", tags: ["work", "ideas"], content: "A good day at the desk. The thing I had been circling for a week finally landed — turns out I was overcomplicating it. Wrote the simple version and it held. Note to self: start with the simple version next time, too." },
  { ago: 4, mood: "pensive", tags: ["rain"], content: "Rain all afternoon. Cancelled plans I was half-dreading anyway. Read, napped, watched the street get shiny. A quiet sort of guilt about the unanswered messages, set down for now." },
  { ago: 5, mood: "restless", tags: ["work"], content: "Too many tabs open, in the browser and otherwise. Could not settle. Tomorrow: one thing at a time." },
  { ago: 6, mood: "calm", tags: ["morning", "tea"], content: "Slow morning. Tea, window, pages. The week feels manageable from here." },
  { ago: 8, mood: "grateful", tags: ["friends", "dinner"], content: "Dinner at Mira's. We laughed until the candles burned low. I keep forgetting that this — people around a table, nothing fancy — is the whole point. Came home full in every sense." },
  { ago: 11, mood: "pensive", tags: ["travel", "trains"], content: "The train was delayed two hours. Instead of fuming I bought a bad coffee and watched the station. Strangers with somewhere to be. Everyone carrying something invisible. Felt tender toward all of us." },
  { ago: 13, mood: "inspired", tags: ["ideas", "morning"], content: "Woke up with the answer. Wrote three pages before breakfast. The notebook is full of arrows and underlines and it is beautiful." },
  { ago: 16, mood: "calm", tags: ["weekend"], content: "Saturday with no agenda. Market, flowers I did not need, a long bath. Rest as a practice, not a reward." },
  { ago: 20, mood: "restless", tags: ["work", "deadlines"], content: "The deadline moved up and my stomach moved with it. Made the list, called for help, breathed. It is a lot, but it is not everything." },
  { ago: 24, mood: "grateful", tags: ["family"], content: "Called home. Mom told the same story twice and I let her. Her laugh at the end fixed something in my chest I had not named." },
  { ago: 31, mood: "calm", tags: ["morning"], content: "First of the month. New page energy. Cleaned the desk, wrote intentions in pencil — erasable, on purpose." },
  { ago: 38, mood: "pensive", tags: ["autumn", "change"], content: "The light is changing. Evenings come earlier and I feel the year turning. Some melancholy, but the useful kind — the kind that makes you pay attention." },
  { ago: 45, mood: "inspired", tags: ["work", "ideas"], content: "Shipped the project. The team dinner, the toasts, the relief. I am proud of what we made and prouder of how we made it — kindly, without theatrics. " + "More of that. ".repeat(40) },
  { ago: 60, mood: "grateful", tags: ["travel", "sea"], content: "The sea, finally. Salt on everything, sand in the notebook. Swam out past the break and floated. Thought: I am small and held. Came back in for lunch hungry and happy." },
  // Same calendar day, previous years — feeds the "on this day" pattern.
  { date: "2025-09-09", mood: "calm", tags: ["anniversary"], backfilled: true, content: "One year ago today: the first day at the new place. Boxes everywhere, takeout on the floor, and the feeling that life was rearranging itself around me. It was." },
  { date: "2024-09-09", mood: "pensive", tags: ["anniversary"], backfilled: true, content: "Two years ago: said goodbye to the old apartment. Stood in the empty rooms a while. Every ending is a room you learn to leave." },
];

try {
  try {
    await call("/auth/signup", { method: "POST", body: { name: NAME, email: EMAIL, password: PASSWORD, timezone: "Asia/Kolkata" } });
    console.log(`signed up ${EMAIL}`);
  } catch (err) {
    if (!String(err.message).includes("409") && !String(err.message).includes("exists")) throw err;
    await call("/auth/login", { method: "POST", body: { email: EMAIL, password: PASSWORD } });
    console.log(`logged in ${EMAIL}`);
  }
  for (const e of ENTRIES) {
    const date = e.date ?? daysAgo(e.ago);
    await call(`/entries/date/${date}`, { method: "PUT", body: { date, content: e.content, mood: e.mood, tags: e.tags, backfilled: Boolean(e.backfilled) } });
    console.log(`wrote ${date} (${e.mood})`);
  }
  const insights = await call("/insights");
  console.log(`\nstreak=${insights.currentStreak} longest=${insights.longestStreak} entries=${insights.totalEntries}`);
  console.log(`\nDone. Log in as ${EMAIL} / ${PASSWORD}`);
} catch (err) {
  console.error(`seed failed: ${err.message}`);
  process.exit(1);
}
