import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, BookHeart, Cpu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { askJournal } from "@/lib/normalize";
import { moodLabel } from "@/lib/types";

const suggestions = [
  "What made me happiest lately?",
  "When did I last feel stuck?",
  "What goals keep coming back?",
  "Summarize my last 10 entries.",
  "Show me entries about work.",
];

export default function Ask() {
  const [question, setQuestion] = useState("");
  const ask = useMutation({
    mutationFn: askJournal,
    onError: () => {},
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (question.trim() && !ask.isPending) ask.mutate(question.trim());
  };

  return <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:py-12" data-testid="ask-page">
    <header className="border-b border-[var(--line)] pb-8">
      <p className="eyebrow eyebrow-rule" data-testid="ask-eyebrow">Ask your own history</p>
      <h1 className="display-heading mt-3 text-balance text-[32px] leading-[1.08] sm:text-5xl" data-testid="ask-heading">Ask your journal</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted-ink)]" data-testid="ask-description">Answers come only from pages you wrote — never invented, always with the source beside them.</p>
    </header>

    <form onSubmit={submit} className="mt-8 flex gap-2" data-testid="ask-form">
      <div className="relative flex-1">
        <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--muted-ink)]" />
        <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What have I been carrying lately?" className="h-11 border-[var(--line)] bg-[var(--paper)] pl-9" data-testid="ask-input" aria-label="Ask your journal" />
      </div>
      <Button type="submit" disabled={ask.isPending || !question.trim()} data-testid="ask-submit-button" aria-label="Ask">{ask.isPending ? "Reading…" : <>Ask <ArrowRight size={15} /></>}</Button>
    </form>

    <div className="mt-4 flex flex-wrap gap-2" data-testid="ask-suggestions">
      {suggestions.map((s) => <button key={s} type="button" onClick={() => { setQuestion(s); ask.mutate(s); }} className="mood-chip" data-testid={`ask-suggestion-${s.slice(0, 12)}`}>{s}</button>)}
    </div>

    <div className="mt-8" data-testid="ask-result-area">
      {ask.isPending && <div className="space-y-3" data-testid="ask-loading"><div className="h-24 animate-pulse rounded-3xl bg-[var(--sand)]" /><div className="h-16 animate-pulse rounded-3xl bg-[var(--sand)]" /></div>}
      {ask.isError && <p className="rounded-2xl bg-[var(--error-bg)] px-5 py-4 text-sm text-[var(--error-text)]" role="alert" data-testid="ask-error">{ask.error instanceof ApiError && typeof ask.error.body === "object" && ask.error.body && "detail" in ask.error.body ? String(ask.error.body.detail) : "Something interrupted the page. Please try again."}</p>}
      {!ask.isPending && !ask.data && !ask.isError && <div className="rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-6 py-14 text-center" data-testid="ask-empty-state"><BookHeart size={24} className="mx-auto text-[var(--terracotta)]" /><p className="mx-auto mt-4 max-w-sm font-serif text-xl" data-testid="ask-empty-heading">Your history is listening.</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted-ink)]" data-testid="ask-empty-copy">Ask about happy stretches, hard days, returning goals — or any word that keeps appearing.</p></div>}
      {ask.data && <div className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 sm:p-8" data-testid="ask-answer-card">
        <p className="font-serif text-xl leading-8 text-[var(--ink-soft)]" data-testid="ask-answer">{ask.data.answer}</p>
        {ask.data.entries.length > 0 && <div className="mt-6 space-y-3 border-t border-[var(--line)] pt-5"><p className="eyebrow" data-testid="ask-sources-heading">From your pages</p>{ask.data.entries.map((entry) => <Link key={entry.id} to={`/app/entry/${entry.id}`} className="block rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 transition-colors hover:border-[var(--terracotta)]" data-testid={`ask-entry-${entry.id}`}>
          <span className="text-xs font-semibold text-[var(--muted-ink)]">{new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}{entry.mood ? ` · ${moodLabel(entry.mood)?.label ?? entry.mood}` : ""}</span>
          <span className="mt-1 line-clamp-2 block font-serif text-[15px] leading-6 text-[var(--ink-soft)]">{entry.excerpt}</span>
        </Link>)}</div>}
        <p className="mt-6 flex items-center gap-1.5 text-[11px] text-[var(--muted-ink)]" data-testid="ask-source-note"><Cpu size={12} /> Answered on this device from your pages{ask.data.source === "local" ? " — nothing was sent anywhere." : ` · source: ${ask.data.source}.`}</p>
      </div>}
    </div>
  </section>;
}
