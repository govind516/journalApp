import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarDays, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { fetchEntryList, fetchInsights } from "@/lib/normalize";
import { fullDate, relativeDay } from "@/lib/dates";
import { MOODS, moodLabel } from "@/lib/types";
import type { Entry } from "@/lib/types";

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 15).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function Timeline() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const tag = params.get("tag") ?? "";
  const mood = params.get("mood") ?? "";
  const searchRef = useRef<HTMLInputElement>(null);
  const entries = useQuery({ queryKey: ["entries", search, tag, mood], queryFn: () => fetchEntryList(`?search=${encodeURIComponent(search)}&tag=${encodeURIComponent(tag)}&mood=${encodeURIComponent(mood)}`) });
  const insights = useQuery({ queryKey: ["insights"], queryFn: fetchInsights });
  useEffect(() => { if (params.get("focus") === "search") searchRef.current?.focus(); }, [params]);
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); next.delete("focus"); setParams(next); };
  const clearFilters = () => setParams(new URLSearchParams());

  const groups = useMemo(() => {
    const list = entries.data ?? [];
    const out: { key: string; label: string; items: Entry[] }[] = [];
    for (const entry of list) {
      const key = monthKey(entry.date);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(entry);
      else out.push({ key, label: monthLabel(key), items: [entry] });
    }
    return out;
  }, [entries.data]);

  return <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12" data-testid="timeline-page"><header className="flex flex-col justify-between gap-5 border-b border-[var(--line)] pb-8 sm:flex-row sm:items-end"><div><p className="eyebrow eyebrow-rule" data-testid="timeline-eyebrow">The pages you’ve kept</p><h1 className="display-heading mt-3 text-balance text-[32px] leading-[1.08] sm:text-5xl" data-testid="timeline-heading">Your timeline</h1><p className="mt-3 text-sm text-[var(--muted-ink)]" data-testid="timeline-description">A little archive of attention, in reverse order.</p></div><span className="text-sm text-[var(--muted-ink)]" data-testid="timeline-entry-count">{entries.data?.length ?? 0} pages</span></header>
    <div className="mt-7 flex flex-col gap-3 sm:flex-row" data-testid="timeline-filters"><div className="relative flex-1"><Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--muted-ink)]" aria-hidden="true" /><Input ref={searchRef} value={search} onChange={(event) => update("search", event.target.value)} placeholder="Search your words…" aria-label="Search your words" className="h-10 border-[var(--line)] bg-[var(--paper)] pl-9" data-testid="timeline-search-input" /></div><select value={mood} onChange={(event) => update("mood", event.target.value)} className="warm-select sm:w-40" data-testid="timeline-mood-filter" aria-label="Filter by feeling"><option value="">All feelings</option>{MOODS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select><select value={tag} onChange={(event) => update("tag", event.target.value)} className="warm-select sm:w-40" data-testid="timeline-tag-filter" aria-label="Filter by tag"><option value="">All tags</option>{(insights.data?.tag_counts ?? []).map((item) => <option value={item.tag} key={item.tag}>#{item.tag}</option>)}</select></div>
    {(search || tag || mood) && <div className="mt-4 flex items-center gap-3 text-xs text-[var(--muted-ink)]" data-testid="active-filters-row"><SlidersHorizontal size={14} /> Showing filtered pages <button onClick={clearFilters} className="font-semibold text-[var(--terracotta)] underline underline-offset-4" data-testid="clear-timeline-filters-button">Clear filters</button></div>}
    <div className="mt-8 space-y-8" data-testid="timeline-entry-list">{entries.isPending && <TimelineSkeleton />}{!entries.isPending && entries.data?.length === 0 && <div className="rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-6 py-16 text-center" data-testid="timeline-empty-state"><CalendarDays size={25} className="mx-auto text-[var(--terracotta)]" /><h2 className="mt-5 font-serif text-2xl" data-testid="timeline-empty-heading">Your story starts here.</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted-ink)]" data-testid="timeline-empty-copy">Write a page today, and this space will become a gentle map of where your thoughts have been.</p><Link to="/app" className="mt-6 inline-flex text-sm font-semibold text-[var(--terracotta)] underline underline-offset-4" data-testid="timeline-empty-action">Write your first entry</Link></div>}{groups.map((group) => <section key={group.key} data-testid={`timeline-month-group-${group.key}`} aria-label={group.label}>
      <div className="mb-4 flex items-baseline gap-3" data-testid={`timeline-month-heading-${group.key}`}>
        <h2 className="font-serif text-xl text-[var(--ink-soft)]">{group.label}</h2>
        <span className="h-px flex-1 bg-[var(--line)]" aria-hidden="true" />
        <span className="text-xs text-[var(--muted-ink)]">{group.items.length} {group.items.length === 1 ? "page" : "pages"}</span>
      </div>
      <div className="space-y-4">{group.items.map((entry) => <TimelineEntry key={entry.id} entry={entry} search={search} momentId={longestId(group.items)} />)}</div>
    </section>)}</div>
  </section>;
}

function longestId(items: Entry[]): string | null {
  let best: Entry | null = null;
  let bestWords = 0;
  for (const item of items) {
    const words = item.content.trim().split(/\s+/).filter(Boolean).length;
    if (words > bestWords && words >= 40) { best = item; bestWords = words; }
  }
  return best?.id ?? null;
}

function TimelineEntry({ entry, search, momentId }: { entry: Entry; search: string; momentId: string | null }) {
  const mood = moodLabel(entry.mood);
  const preview = entry.content.length > 190 ? `${entry.content.slice(0, 190)}…` : entry.content;
  const highlighted = search ? preview.replace(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"), "__$1__").split("__").map((part, index) => index % 2 ? <mark key={index}>{part}</mark> : part) : preview;
  return <Link to={`/app/entry/${entry.id}`} className="group block rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-card-hover)] active:translate-y-0 active:scale-[0.99] sm:p-7" data-testid={`timeline-entry-${entry.id}`}><div className="flex flex-wrap items-center justify-between gap-3"><span className="flex items-center gap-3 text-xs font-semibold tracking-wide text-[var(--muted-ink)]" data-testid={`timeline-entry-date-${entry.id}`}><span className="font-serif text-[26px] font-medium leading-none tracking-normal text-[var(--ink-soft)]" aria-hidden="true">{entry.date.slice(8, 10)}</span><span>{relativeDay(entry.date) ? `${relativeDay(entry.date)} · ` : ""}{fullDate(entry.date)}</span>{entry.backfilled && <Badge variant="outline" data-testid={`timeline-entry-backfilled-${entry.id}`}>Backfilled</Badge>}{momentId === entry.id && <Badge variant="outline" data-testid={`timeline-moment-${entry.id}`}>A longer page</Badge>}</span>{mood && <span className="mood-chip" data-testid={`timeline-entry-mood-${entry.id}`}>{mood.emoji} {mood.label}</span>}</div><p className="mt-5 line-clamp-4 whitespace-pre-line break-words font-serif text-xl leading-8 text-[var(--ink-soft)]" data-testid={`timeline-entry-preview-${entry.id}`}>{highlighted}</p>{entry.tags.length > 0 && <div className="mt-5 flex flex-wrap gap-2" data-testid={`timeline-entry-tags-${entry.id}`}>{entry.tags.map((tag) => <span className="tag-chip-static" key={tag}>#{tag}</span>)}</div>}<div className="mt-6 flex items-center justify-between text-xs text-[var(--muted-ink)]"><span data-testid={`timeline-entry-word-count-${entry.id}`}>{entry.content.trim().split(/\s+/).filter(Boolean).length} words</span><span className="font-semibold text-[var(--terracotta-deep)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 max-sm:opacity-100" data-testid={`timeline-entry-open-${entry.id}`}>Open page →</span></div></Link>;
}

function TimelineSkeleton() { return <>{[1, 2, 3].map((item) => <div key={item} className="h-52 animate-pulse rounded-3xl bg-[var(--sand)]" data-testid={`timeline-skeleton-${item}`} />)}</>; }
