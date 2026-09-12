import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, ChevronLeft, ChevronRight, Lock, Sparkles } from "lucide-react";
import { fetchInsights, fetchReflection } from "@/lib/normalize";
import EmberMark from "@/components/EmberMark";
import { moodLabel, MOODS } from "@/lib/types";
import type { Insights as InsightsData, MoodPoint } from "@/lib/types";

const SEEN_KEY = "journal-badges-seen";

function loadSeen(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function reflectionFor(points: MoodPoint[], streak: number): { copy: string; support: string } {
  if (points.length === 0) {
    return streak > 0
      ? { copy: "You are building a place you can return to.", support: "The value is in noticing, not in getting it right." }
      : { copy: "There is no behind. There is only the next page.", support: "The value is in noticing, not in getting it right." };
  }
  const heavy = points.filter((p) => p.mood === "restless" || p.mood === "pensive").length;
  const light = points.filter((p) => p.mood === "calm" || p.mood === "grateful" || p.mood === "inspired").length;
  if (heavy > light && heavy >= 2) {
    return { copy: "Some days weigh more than others.", support: "You still came back to the page. That counts for more than the mood." };
  }
  if (light > heavy && light >= 2) {
    return { copy: "A steadier stretch.", support: "Notice what these days had in common — gently, without making rules out of it." };
  }
  return { copy: "Weather, not climate.", support: "Feelings move through. The pages keep what matters." };
}

export default function Insights() {
  const [range, setRange] = useState<"week" | "month">("week");
  const [reflectMonth, setReflectMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const query = useQuery({ queryKey: ["insights"], queryFn: fetchInsights });
  const data = query.data;
  const [seenBadges, setSeenBadges] = useState<string[]>(() => (typeof window === "undefined" ? [] : loadSeen()));
  const visiblePoints = data?.mood_points.filter((point) => { const age = (Date.now() - new Date(`${point.date}T12:00:00`).getTime()) / 86400000; return age <= (range === "week" ? 7 : 31); }) ?? [];
  const unlockedNames = (data?.badges ?? []).filter((b) => b.unlocked).map((b) => b.name);

  useEffect(() => {
    if (unlockedNames.length === 0) return;
    setSeenBadges((seen) => {
      const merged = Array.from(new Set([...seen, ...unlockedNames]));
      try { window.localStorage.setItem(SEEN_KEY, JSON.stringify(merged)); } catch { /* private mode */ }
      return merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  const isNewlyUnlocked = (name: string, unlocked: boolean) => unlocked && !seenBadges.includes(name);
  const reflection = reflectionFor(visiblePoints, data?.current_streak ?? 0);

  return <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12" data-testid="insights-page"><header className="border-b border-[var(--line)] pb-8"><p className="eyebrow eyebrow-rule" data-testid="insights-eyebrow">A mirror, not a metric</p><h1 className="display-heading mt-3 text-balance text-[32px] leading-[1.08] sm:text-5xl" data-testid="insights-heading">What your days are saying</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted-ink)]" data-testid="insights-description">A few soft signals from the pages you’ve written. Reflection, never diagnosis.</p></header>{data !== undefined && (data.total_entries ?? 0) === 0 && <div className="mt-8 rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-6 py-10 text-center" data-testid="insights-empty-state"><p className="font-serif text-xl" data-testid="insights-empty-heading">Your first page is still ahead of you.</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted-ink)]" data-testid="insights-empty-copy">Write today, and these numbers will start to mean something.</p><Link to="/app" className="mt-4 inline-flex text-sm font-semibold text-[var(--terracotta)] underline underline-offset-4" data-testid="insights-empty-action">Write today’s page →</Link></div>}<div className="mt-8 grid gap-6 border-y border-[var(--line)] py-7 sm:grid-cols-3" data-testid="streak-summary-grid"><StatCard icon={<EmberMark size={18} className="text-[var(--ochre)]" />} label="Current rhythm" value={`${data?.current_streak ?? 0} days`} accent /><StatCard icon={<Award size={18} />} label="Longest rhythm" value={`${data?.longest_streak ?? 0} days`} /><StatCard icon={<Sparkles size={18} />} label="Pages written" value={String(data?.total_entries ?? 0)} /></div><div className="mt-8 grid gap-6 md:grid-cols-[1.35fr_0.65fr]"><section className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-8" data-testid="mood-trends-card"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow" data-testid="mood-trends-eyebrow">Your recent weather</p><h2 className="mt-2 font-serif text-2xl" data-testid="mood-trends-heading">How you’ve been feeling</h2></div><div className="relative flex rounded-full bg-[var(--sand)] p-1" data-testid="mood-range-toggle">{([["week", "This week", "mood-week-toggle"], ["month", "This month", "mood-month-toggle"]] as const).map(([value, label, testId]) => <button key={value} className={`relative rounded-full px-3 py-1.5 text-xs font-semibold ${range === value ? "text-[var(--ink)]" : "text-[var(--muted-ink)]"}`} onClick={() => setRange(value)} data-testid={testId}>{range === value && <motion.span layoutId="mood-range-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-full bg-[var(--paper)] shadow-sm" aria-hidden="true" />}<span className="relative">{label}</span></button>)}</div></div>{visiblePoints.length === 0 ? <div className="py-16 text-center" data-testid="mood-empty-state"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--sage-soft)] text-xl">☁️</span><p className="mx-auto mt-5 max-w-sm font-serif text-xl" data-testid="mood-empty-heading">Your inner weather will show up here.</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted-ink)]" data-testid="mood-empty-copy">Try adding a feeling to your next page. Not to track yourself — just to notice.</p></div> : <div className="mt-8 overflow-x-auto" data-testid="mood-chart"><div className="min-w-[520px]"><MoodChart points={visiblePoints} /></div><div className="mt-5 flex flex-wrap gap-3">{MOODS.map((item) => <span key={item.value} className="flex items-center gap-1.5 text-xs text-[var(--muted-ink)]"><span>{item.emoji}</span>{item.label}</span>)}</div><p className="mt-3 text-[11px] text-[var(--muted-ink)]" data-testid="mood-chart-caption">Up and down mean different, never better.</p></div>}</section><section className="rounded-3xl bg-[var(--terracotta)] p-7 text-[var(--on-accent)]" data-testid="insights-reflection-card"><p className="eyebrow-on-accent" data-testid="insights-reflection-eyebrow">A note for you</p><p className="mt-5 font-serif text-3xl leading-9" data-testid="insights-reflection-copy">{reflection.copy}</p><p className="mt-6 text-sm leading-6 opacity-70" data-testid="insights-reflection-support">{reflection.support}</p></section></div><ReflectionCard month={reflectMonth} onShift={(delta) => setReflectMonth((m) => shiftMonth(m, delta))} /><section className="mt-8" data-testid="badges-section"><div className="flex items-end justify-between"><div><p className="eyebrow" data-testid="badges-eyebrow">Small milestones</p><h2 className="mt-2 font-serif text-3xl" data-testid="badges-heading">Badges for returning</h2></div><span className="text-xs text-[var(--muted-ink)]" data-testid="badges-progress-label">{data?.badges.filter((badge) => badge.unlocked).length ?? 0} of {data?.badges.length ?? 0} found</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(data?.badges ?? []).map((badge) => <BadgeCard key={badge.name} name={badge.name} description={badge.description} unlocked={badge.unlocked} celebrate={isNewlyUnlocked(badge.name, badge.unlocked)} />)}</div></section></section>;
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ReflectionCard({ month, onShift }: { month: string; onShift: (delta: number) => void }) {
  const reflection = useQuery({ queryKey: ["reflection", month], queryFn: () => fetchReflection(month) });
  const r = reflection.data;
  return <section className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 sm:p-8" data-testid="reflection-card">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="eyebrow" data-testid="reflection-eyebrow">The month, gathered</p>
        <h2 className="mt-2 font-serif text-2xl" data-testid="reflection-title">{r?.title ?? "Your month"}</h2>
      </div>
      <div className="flex items-center gap-1" data-testid="reflection-month-nav">
        <button onClick={() => onShift(-1)} className="rounded-full p-2 text-[var(--muted-ink)] transition-colors hover:bg-[var(--sand)] hover:text-[var(--ink)]" data-testid="reflection-prev-month" aria-label="Previous month"><ChevronLeft size={16} /></button>
        <span className="min-w-20 text-center text-xs font-semibold tabular-nums text-[var(--muted-ink)]" data-testid="reflection-month-label">{month}</span>
        <button onClick={() => onShift(1)} className="rounded-full p-2 text-[var(--muted-ink)] transition-colors hover:bg-[var(--sand)] hover:text-[var(--ink)]" data-testid="reflection-next-month" aria-label="Next month"><ChevronRight size={16} /></button>
      </div>
    </div>
    {reflection.isPending && <div className="mt-6 h-28 animate-pulse rounded-2xl bg-[var(--sand)]" data-testid="reflection-loading" />}
    {r && <>
      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm" data-testid="reflection-stats">
        <span><strong className="font-serif text-xl tabular-nums">{r.entries}</strong> <span className="text-[var(--muted-ink)]">{r.entries === 1 ? "page" : "pages"}</span></span>
        <span><strong className="font-serif text-xl tabular-nums">{r.writingDays}</strong> <span className="text-[var(--muted-ink)]">days</span></span>
        {r.topMood && <span><strong className="font-serif text-xl">{moodLabel(r.topMood)?.label ?? r.topMood}</strong> <span className="text-[var(--muted-ink)]">prevailing</span></span>}
        {r.topTags.map((t) => <span key={t.tag} className="tag-chip-static">#{t.tag}</span>)}
      </div>
      <p className="mt-5 font-serif text-xl leading-8 text-[var(--ink-soft)]" data-testid="reflection-narrative">{r.narrative}</p>
      {r.longestEntryId && <Link to={`/app/entry/${r.longestEntryId}`} className="mt-4 inline-flex text-sm font-semibold text-[var(--terracotta)] underline underline-offset-4" data-testid="reflection-longest-link">Revisit the longest sitting-down →</Link>}
    </>}
  </section>;
}

function MoodChart({ points }: { points: MoodPoint[] }) {
  const W = 640, H = 208, GUTTER = 104, TOP = 18, BOTTOM = 26;
  const laneY = (index: number) => TOP + index * ((H - TOP - BOTTOM) / Math.max(1, MOODS.length - 1));
  const coords = points.map((p, i) => {
    const lane = Math.max(0, MOODS.findIndex((m) => m.value === p.mood));
    const x = points.length === 1 ? (GUTTER + W) / 2 : GUTTER + (i * (W - GUTTER - 16)) / (points.length - 1);
    return { p, x, y: laneY(lane) };
  });
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = coords.length > 1 ? `${line} L${coords[coords.length - 1].x.toFixed(1)},${H - 8} L${coords[0].x.toFixed(1)},${H - 8} Z` : "";
  const labelEvery = Math.max(1, Math.ceil(coords.length / 7));
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Mood across recent days" data-testid="mood-chart-svg">
    <defs>
      <linearGradient id="mood-area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--terracotta)" stopOpacity="0.28" />
        <stop offset="100%" stopColor="var(--terracotta)" stopOpacity="0" />
      </linearGradient>
    </defs>
    {MOODS.map((m, i) => <g key={m.value}>
      <line x1={GUTTER} y1={laneY(i)} x2={W - 8} y2={laneY(i)} stroke="var(--line)" strokeWidth="1" strokeDasharray={i === 0 ? "" : "3 5"} />
      <text x={GUTTER - 10} y={laneY(i) + 4} textAnchor="end" fontSize="11" fill="var(--muted-ink)">{m.emoji} {m.label}</text>
    </g>)}
    {area && <path d={area} fill="url(#mood-area)" />}
    {coords.length > 1 && <path d={line} fill="none" stroke="var(--terracotta)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
    {coords.map((c, i) => <g key={`${c.p.date}-${c.p.mood}`} data-testid={`mood-chart-point-${c.p.date}`}>
      <title>{`${c.p.date}: ${moodLabel(c.p.mood)?.label ?? c.p.mood}`}</title>
      <circle cx={c.x} cy={c.y} r="6" fill="var(--paper)" stroke="var(--terracotta)" strokeWidth="2.5" />
      {i % labelEvery === 0 || i === coords.length - 1 ? <text x={c.x} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted-ink)">{new Date(`${c.p.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</text> : null}
    </g>)}
  </svg>;
}

function BadgeCard({ name, description, unlocked, celebrate }: { name: string; description: string; unlocked: boolean; celebrate: boolean }) {
  const slug = name.toLowerCase().replaceAll(" ", "-");
  return <motion.div
    initial={celebrate ? { scale: 0.9, opacity: 0 } : false}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: "spring", stiffness: 300, damping: 18 }}
    className={`relative overflow-hidden rounded-3xl border p-5 ${unlocked ? "border-[var(--terracotta)] bg-[var(--paper)]" : "border-[var(--line)] bg-[var(--sand)]"}`}
    data-testid={`badge-card-${slug}`}
  >
    {celebrate && <motion.span
      aria-hidden="true"
      initial={{ opacity: 0.9, scale: 0.7 }}
      animate={{ opacity: 0, scale: 1.5 }}
      transition={{ duration: 1.4, ease: "easeOut" }}
      className="pointer-events-none absolute inset-0 rounded-3xl"
      style={{ boxShadow: "0 0 0 3px var(--terracotta), 0 0 32px 4px var(--terracotta-soft)" }}
      data-testid={`badge-unlock-glow-${slug}`}
    />}
    <div className={`flex size-10 items-center justify-center rounded-full ${unlocked ? "bg-[var(--terracotta-soft)] text-[var(--terracotta-deep)]" : "bg-[var(--line)] text-[var(--muted-ink)]"}`}>{unlocked ? (celebrate ? <EmberMark size={19} /> : <Award size={19} />) : <Lock size={17} />}</div>
    <p className="mt-5 font-serif text-lg" data-testid={`badge-name-${slug}`}>{name}</p>
    <p className="mt-1 text-xs leading-5 text-[var(--muted-ink)]" data-testid={`badge-description-${slug}`}>{description}</p>
    {celebrate && <p className="mt-3 text-xs font-semibold text-[var(--terracotta-deep)]" data-testid={`badge-new-label-${slug}`}>Just found — nicely returned to.</p>}
  </motion.div>;
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string; accent?: boolean }) { return <div data-testid={`stat-card-${label.toLowerCase().replaceAll(" ", "-")}`}><div className="flex items-center gap-2 text-[var(--terracotta)]" data-testid={`stat-icon-${label.toLowerCase().replaceAll(" ", "-")}`}>{icon}<span className="eyebrow">{label}</span></div><p className="mt-2 font-serif text-[40px] leading-none tabular-nums" data-testid={`stat-value-${label.toLowerCase().replaceAll(" ", "-")}`}>{value}</p></div>; }
