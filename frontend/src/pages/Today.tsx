import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronRight, Clock, Focus, Keyboard, Lightbulb, Minimize2, Plus, RotateCcw, Search, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiPut } from "@/lib/api";
import { fetchMe } from "@/lib/session";
import { fetchEntryByDate, fetchInsights, fetchMemory, fetchOnThisDay, fetchToday } from "@/lib/normalize";
import { clearDraft, loadDraft, saveDraft, sweepStaleDrafts } from "@/lib/drafts";
import { enqueueWrite, queuedCount, subscribeQueue } from "@/lib/syncQueue";
import { setCommandPalette } from "@/lib/commandPalette";
import { setFocusMode, useFocusMode } from "@/lib/focusMode";
import EmberMark from "@/components/EmberMark";
import { MOODS, moodLabel } from "@/lib/types";
import type { Entry, EntryPayload, MemorySignal } from "@/lib/types";

function memoryHref(signal: MemorySignal): string {
  const word = signal.title.match(/“(.+)”/)?.[1] ?? signal.title.match(/#(\S+)/)?.[1];
  if (signal.kind === "phrase" && word) return `/app/timeline?search=${encodeURIComponent(word)}`;
  if (signal.kind === "tag" && word) return `/app/timeline?tag=${encodeURIComponent(word)}`;
  if (signal.kind === "anniversary") return "/app/calendar";
  return "/app/insights";
}

function MemorySignalRow({ signal }: { signal: MemorySignal }) {
  return <Link to={memoryHref(signal)} className="group block" data-testid={`memory-signal-${signal.kind}`}>
    <p className="font-serif text-[17px] leading-6 text-[var(--ink-soft)] transition-colors group-hover:text-[var(--terracotta-deep)]" data-testid="memory-signal-title">{signal.title}</p>
    <p className="mt-1 text-xs leading-5 text-[var(--muted-ink)]" data-testid="memory-signal-detail">{signal.detail}</p>
  </Link>;
}

const prompts = ["What made you pause today?", "What felt a little more like yourself today?", "What are you carrying that you could set down for a moment?", "Where did your attention go when no one was asking for it?"];

export default function Today() {
  const [searchParams] = useSearchParams();
  const requestedDate = searchParams.get("date");
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const todayQuery = useQuery({
    queryKey: ["today", requestedDate ?? "current"],
    queryFn: async (): Promise<{ date: string; entry: Entry | null }> => requestedDate ? { date: requestedDate, entry: await fetchEntryByDate(requestedDate) } : fetchToday(),
  });
  const insights = useQuery({ queryKey: ["insights"], queryFn: fetchInsights });
  const memory = useQuery({ queryKey: ["memory"], queryFn: fetchMemory });
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [dirty, setDirty] = useState(false);
  const [savedLabel, setSavedLabel] = useState("Saved");
  const [savedTick, setSavedTick] = useState(0);
  // Live queue depth: the indicator must reflect actual queue status, not just
  // "no error thrown" — a write can sit queued while the label says Saved.
  const [queued, setQueued] = useState(() => queuedCount());
  useEffect(() => subscribeQueue(() => setQueued(queuedCount())), []);
  const [promptIndex, setPromptIndex] = useState(() => new Date().getDate() % prompts.length);
  const [promptVisible, setPromptVisible] = useState(true);
  const focusMode = useFocusMode();
  const toggleFocus = () => setFocusMode(!focusMode);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [recoveredAt, setRecoveredAt] = useState<number | null>(null);
  const date = todayQuery.data?.date ?? requestedDate ?? "";
  const entry = todayQuery.data?.entry;
  const todayWritten = Boolean(entry?.content?.trim());
  const anniversaries = useQuery({ queryKey: ["on-this-day", date], queryFn: () => fetchOnThisDay(date), enabled: Boolean(date) });

  useEffect(() => {
    sweepStaleDrafts();
  }, []);

  useEffect(() => {
    if (!todayQuery.data) return;
    const dayNumber = Number(todayQuery.data.date.slice(-2));
    if (Number.isFinite(dayNumber)) setPromptIndex(dayNumber % prompts.length);
    const serverContent = todayQuery.data.entry?.content ?? "";
    const draft = loadDraft(todayQuery.data.date);
    if (!serverContent && draft?.content) {
      // The server has nothing, but unsent words are waiting — bring them back.
      setContent(draft.content);
      setMood(draft.mood ?? null);
      setTags(draft.tags ?? []);
      setDirty(true);
      setRecoveredAt(draft.updatedAt);
      setSavedLabel("Recovered unsent words");
    } else {
      setContent(serverContent);
      setMood(todayQuery.data.entry?.mood ?? null);
      setTags(todayQuery.data.entry?.tags ?? []);
      setDirty(false);
      setRecoveredAt(null);
      setSavedLabel(todayQuery.data.entry ? "Saved" : "A blank page, ready");
    }
  }, [todayQuery.data]);

  const save = useMutation({
    mutationFn: (payload: EntryPayload) => apiPut<Entry>(`/entries/date/${payload.date}`, payload),
    onSuccess: (_data, payload) => {
      setDirty(false);
      setRecoveredAt(null);
      setSavedLabel("Saved just now");
      setSavedTick((tick) => tick + 1);
      clearDraft(payload.date);
      queryClient.invalidateQueries({ queryKey: ["today"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
    onError: (err, payload) => {
      const offline = !window.navigator.onLine || err instanceof TypeError;
      if (offline && date) {
        const base = entry ? { content: entry.content, updatedAt: entry.updated_at } : null;
        enqueueWrite(payload, base);
        setSavedLabel("Will save when you return");
      } else {
        setSavedLabel("Couldn’t save — try again");
      }
    },
  });

  const saveNow = () => {
    if (!date || save.isPending) return;
    save.mutate({ date, content, mood, tags, backfilled: Boolean(requestedDate) });
  };

  useEffect(() => {
    const tag = () => document.activeElement?.tagName;
    const typing = () => tag() === "TEXTAREA" || tag() === "INPUT" || tag() === "SELECT";
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveNow();
        return;
      }
      if (typing()) {
        if (event.key === "Escape") (document.activeElement as HTMLElement)?.blur();
        return;
      }
      if (event.key === "Escape" && focusMode) {
        toggleFocus();
        return;
      }
      if (event.key.toLowerCase() === "f") toggleFocus();
      if (event.key === "?") setShowShortcuts(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, content, mood, tags, focusMode]);

  useEffect(() => {
    if (!dirty || !date) return;
    const timer = window.setTimeout(() => {
      saveDraft(date, { content, mood, tags });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [content, date, dirty, mood, tags]);

  useEffect(() => {
    if (!dirty || !date) return;
    const timer = window.setTimeout(() => save.mutate({ date, content, mood, tags, backfilled: Boolean(requestedDate) }), 850);
    return () => window.clearTimeout(timer);
  }, [content, date, dirty, mood, requestedDate, save, tags]);

  const wordCount = useMemo(() => content.trim() ? content.trim().split(/\s+/).length : 0, [content]);
  const formattedDate = date ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "Today";

  const updateContent = (value: string) => { setContent(value); setDirty(true); setSavedLabel("Saving…"); };
  const updateMood = (value: string) => { setMood((current) => current === value ? null : value); setDirty(true); setSavedLabel("Saving…"); };
  const addTag = () => { const next = tagInput.trim().toLowerCase().replace(/^#/, ""); if (next && !tags.includes(next)) { setTags((current) => [...current, next]); setDirty(true); setSavedLabel("Saving…"); } setTagInput(""); };
  const streak = insights.data?.current_streak ?? 0;

  const discardDraft = () => {
    setContent(entry?.content ?? "");
    setMood(entry?.mood ?? null);
    setTags(entry?.tags ?? []);
    setDirty(false);
    setRecoveredAt(null);
    setSavedLabel(entry ? "Saved" : "A blank page, ready");
    clearDraft(date);
  };

  return <section className={`mx-auto px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-12 ${focusMode ? "max-w-3xl" : "max-w-6xl"}`} data-testid="today-page">
    <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 sm:pb-8" data-testid="today-header"><div><p className="eyebrow eyebrow-rule flex items-center gap-2" data-testid="today-eyebrow"><span className="size-1.5 rounded-full bg-[var(--moss)]" /> {requestedDate ? "A backfilled page" : "Your page for today"}</p><h1 className="display-heading mt-3 text-balance text-[32px] leading-[1.08] sm:text-5xl" data-testid="today-date-heading">{formattedDate}</h1><p className="mt-3 text-sm text-[var(--muted-ink)]" data-testid="today-welcome-copy">{requestedDate ? "A day worth remembering, even if it happened before this journal." : `Good to see you, ${user?.name?.split(" ")[0] ?? "writer"}. Take your time.`}</p></div><div className={`items-center gap-3 ${focusMode ? "hidden" : "flex"}`} data-testid="today-header-stats"><div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm" data-testid="today-streak-indicator"><EmberMark size={16} className={`text-[var(--ochre)] ${streak > 0 ? "animate-ember-glow" : ""}`} /><strong>{streak}</strong><span className="text-[var(--muted-ink)]">day rhythm</span></div><Link to="/app/insights" className="text-xs font-semibold text-[var(--terracotta-deep)] underline underline-offset-4" data-testid="today-view-insights-link">View insights</Link></div></header>
    <div className={`grid gap-6 pt-6 sm:gap-8 sm:pt-8 ${focusMode ? "" : "md:grid-cols-[minmax(0,1fr)_240px] lg:grid-cols-[minmax(0,1fr)_270px]"}`} data-testid="today-workspace-grid"><div className="min-w-0 max-w-[72ch]">
      {recoveredAt && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line-strong)] bg-[var(--terracotta-soft)] px-4 py-3 text-xs text-[var(--terracotta-deep)] sm:mb-6" data-testid="draft-recovered-note"><span>Welcome back — these unsent words were waiting for you.</span><button onClick={discardDraft} className="font-semibold underline underline-offset-4" data-testid="discard-draft-button">Discard them</button></div>}
      {!focusMode && promptVisible && <div className="mb-5 flex items-start gap-4 rounded-2xl border border-[var(--line)] bg-[var(--sand)] px-4 py-4 sm:mb-6 sm:px-5" data-testid="today-prompt-card"><Lightbulb size={17} className="mt-0.5 shrink-0 text-[var(--terracotta)]" /><div className="min-w-0 flex-1"><p className="eyebrow" data-testid="prompt-eyebrow">A thought to begin with</p><p className="mt-1 font-serif text-lg italic text-[var(--ink-soft)]" data-testid="today-prompt-text">{prompts[promptIndex]}</p></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon-sm" onClick={() => setPromptIndex((index) => (index + 1) % prompts.length)} data-testid="next-prompt-button" aria-label="Next prompt"><RotateCcw size={15} /></Button><Button variant="ghost" size="icon-sm" onClick={() => setPromptVisible(false)} data-testid="dismiss-prompt-button" aria-label="Dismiss prompt"><X size={15} /></Button></div></div>}
      {!focusMode && !promptVisible && <button className="mb-5 flex items-center gap-2 text-xs font-semibold text-[var(--terracotta)] sm:mb-6" onClick={() => setPromptVisible(true)} data-testid="restore-prompt-button"><Lightbulb size={14} /> Bring back the prompt</button>}
      <div className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-4 shadow-[var(--shadow-md)] transition-colors focus-within:border-[var(--line-strong)] sm:rounded-[28px] sm:p-8" data-testid="today-editor-card">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
          <motion.span
            key={savedTick}
            initial={reduceMotion || savedTick === 0 ? false : { scale: 0.94, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className="flex min-w-0 items-center gap-2 text-xs text-[var(--muted-ink)]"
            data-testid="save-status-indicator"
          >
            {save.isPending
              ? <span className="size-2 shrink-0 animate-pulse rounded-full bg-[var(--ochre)]" />
              : queued > 0
                ? <Clock size={13} className="shrink-0 text-[var(--terracotta)]" />
                : savedLabel.startsWith("Saved")
                  ? <Check size={13} className="shrink-0 text-[var(--moss)]" />
                  : null}
            <span className="truncate">{save.isPending ? "Saving…" : queued > 0 ? `Waiting — ${queued} queued` : savedLabel}</span>
          </motion.span>
          <span className="shrink-0 text-xs tabular-nums text-[var(--muted-ink)]" data-testid="word-count-indicator">{wordCount} {wordCount === 1 ? "word" : "words"}</span>
          <span className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setCommandPalette(true)} data-testid="editor-search-button" aria-label="Search your pages (⌘K)" title="Search your pages (⌘K)"><Search size={15} /></Button>
            <Button variant="ghost" size="icon-sm" onClick={toggleFocus} aria-pressed={focusMode} data-testid="focus-mode-toggle" aria-label={focusMode ? "Leave focus mode" : "Enter focus mode"} title="Focus mode (F)">{focusMode ? <Minimize2 size={15} /> : <Focus size={15} />}</Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setShowShortcuts(true)} data-testid="shortcuts-help-button" aria-label="Keyboard shortcuts" title="Shortcuts (?)"><Keyboard size={15} /></Button>
          </span>
        </div>
        <Textarea value={content} onChange={(event) => updateContent(event.target.value)} placeholder="Start wherever you are…" enterKeyHint="enter" className="min-h-[46svh] resize-none border-0 bg-transparent px-0 py-6 font-serif text-xl leading-9 text-[var(--ink-soft)] shadow-none placeholder:text-[var(--placeholder)] focus-visible:ring-0 sm:min-h-[430px] sm:py-7 sm:text-[22px]" data-testid="today-editor-textarea" aria-label="Journal entry" />
        <div className="border-t border-[var(--line)] pt-4 sm:pt-5" data-testid="mood-picker-block">
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pt-1 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:py-0" data-testid="mood-picker" role="group" aria-label="How are you feeling?">
            <span className="mr-1 hidden shrink-0 self-center text-xs text-[var(--muted-ink)] sm:inline">Feeling</span>
            {MOODS.map((item) => <motion.button key={item.value} type="button" whileTap={{ scale: 0.9 }} onClick={() => updateMood(item.value)} aria-pressed={mood === item.value} className={`mood-chip shrink-0 snap-start ${mood === item.value ? "mood-chip-active" : ""}`} data-testid={`mood-option-${item.value}`} aria-label={item.label}>{item.emoji} <span className="hidden sm:inline">{item.label}</span></motion.button>)}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-[var(--muted-ink)] sm:hidden">How are you feeling? <span className="font-semibold text-[var(--ink-soft)]">{mood ? moodLabel(mood)?.label : "—"}</span></span>
            <span className="ml-auto hidden text-xs text-[var(--muted-ink)] sm:inline" data-testid="editor-hint">Your words are yours. Always.</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5" data-testid="entry-tags-area"><Tag size={15} className="text-[var(--muted-ink)]" /><span className="text-xs text-[var(--muted-ink)]">Tags</span>{tags.map((tag) => <span key={tag} className="tag-chip" data-testid={`entry-tag-${tag}`}>#{tag}<button onClick={() => { setTags((current) => current.filter((item) => item !== tag)); setDirty(true); }} data-testid={`remove-tag-${tag}`} aria-label={`Remove ${tag}`}><X size={11} /></button></span>)}<div className="flex min-w-0 flex-1 items-center gap-1"><input value={tagInput} onChange={(event) => setTagInput(event.target.value)} enterKeyHint="done" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} placeholder="Add a tag" className="tag-input min-w-0 flex-1 sm:flex-none" data-testid="entry-tag-input" aria-label="Add a tag" /><button onClick={addTag} className="shrink-0 text-[var(--terracotta)]" data-testid="add-tag-button" aria-label="Add tag"><Plus size={18} /></button></div></div>
      <p className="mt-4 text-center text-xs text-[var(--muted-ink)] sm:hidden" data-testid="editor-hint-mobile">Your words are yours. Always.</p>
    </div>{!focusMode && <aside className="flex flex-col gap-4 lg:gap-4" data-testid="today-sidebar"><div className="rounded-3xl bg-[var(--terracotta)] p-6 text-[var(--on-accent)]" data-testid="today-reflection-card"><p className="eyebrow-on-accent" data-testid="today-reflection-eyebrow">A gentle nudge</p><p className="mt-4 font-serif text-2xl leading-8" data-testid="today-reflection-copy">{todayWritten ? "Today’s page is keeping the rhythm." : streak > 0 ? `Your ${streak}-day rhythm is waiting for you today.` : "The first page is the only one that asks for courage."}</p><p className="mt-5 text-sm leading-6 opacity-70" data-testid="today-reflection-support">There is no right length. A few true sentences are enough.</p></div><div className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6" data-testid="today-mood-summary"><p className="eyebrow" data-testid="today-mood-summary-label">Today’s feeling</p><div className="mt-4 flex items-center gap-3">{mood ? <><span className={`flex size-11 items-center justify-center rounded-full bg-[var(--mood-${mood}-bg)] text-2xl`} data-testid="today-selected-mood-icon">{moodLabel(mood)?.emoji}</span><div><p className="font-serif text-lg" data-testid="today-selected-mood-label">{moodLabel(mood)?.label}</p><button className="text-xs text-[var(--terracotta-deep)]" onClick={() => updateMood(mood)} data-testid="clear-mood-button">Clear</button></div></> : <p className="text-sm leading-6 text-[var(--muted-ink)]" data-testid="today-no-mood-copy">Optional, always. Add a feeling when one wants to be named.</p>}</div></div><Link to="/app/timeline" className="order-[-1] flex items-center justify-between rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-5 text-sm font-semibold transition-colors hover:border-[var(--terracotta)] lg:order-none" data-testid="today-timeline-link"><span>Look back through your pages</span><ChevronRight size={16} className="text-[var(--terracotta)]" /></Link>{(memory.data?.signals?.length ?? 0) > 0 && <div className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6" data-testid="today-memory-card"><p className="eyebrow" data-testid="today-memory-eyebrow">Your journal remembers</p><div className="mt-4 space-y-4">{memory.data!.signals.slice(0, 3).map((signal) => <MemorySignalRow key={`${signal.kind}-${signal.title}`} signal={signal} />)}</div></div>}{(anniversaries.data?.length ?? 0) > 0 && <div className="rounded-3xl border border-[var(--terracotta)]/30 bg-[var(--terracotta-soft)] p-6" data-testid="today-anniversary-card"><p className="eyebrow text-[var(--terracotta-deep)]" data-testid="today-anniversary-eyebrow">On this day, other years</p><div className="mt-4 space-y-3">{anniversaries.data!.slice(0, 2).map((memory) => <Link key={memory.id} to={`/app/entry/${memory.id}`} className="block rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 transition-colors hover:border-[var(--terracotta)]" data-testid={`today-anniversary-${memory.id}`}><span className="text-xs font-semibold text-[var(--muted-ink)]">{new Date(`${memory.date}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span><span className="mt-1 line-clamp-2 block font-serif text-[15px] leading-6 text-[var(--ink-soft)]">{memory.content}</span></Link>)}</div></div>}</aside>}</div>
    <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}><DialogContent data-testid="shortcuts-dialog"><DialogHeader><DialogTitle data-testid="shortcuts-dialog-title">Quiet shortcuts</DialogTitle><DialogDescription data-testid="shortcuts-dialog-copy">Small keys for staying with your thoughts.</DialogDescription></DialogHeader><div className="space-y-3 text-sm" data-testid="shortcuts-list">
      {[["Save right now", "⌘ S"], ["Focus mode", "F"], ["Search your pages", "⌘ K  or  /"], ["Leave the field", "Esc"], ["This list", "?"]].map(([label, keys]) => <div key={label} className="flex items-center justify-between gap-4"><span className="text-[var(--ink-soft)]">{label}</span><span className="kbd">{keys}</span></div>)}
    </div></DialogContent></Dialog>
  </section>;
}
