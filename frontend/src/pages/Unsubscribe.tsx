import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, BellOff, PenLine } from "lucide-react";
import { apiGet } from "@/lib/api";

/**
 * No-login unsubscribe landing. Reuses the public Landing shell so a
 * logged-out click still feels like the product.
 */
export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"working" | "done" | "invalid">("working");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    apiGet<{ ok: boolean }>(`/reminders/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(() => setState("done"))
      .catch(() => setState("invalid"));
  }, [token]);

  return <div className="paper-noise min-h-svh bg-[var(--linen)] text-[var(--ink)]" data-testid="unsubscribe-page">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-10" data-testid="unsubscribe-header">
      <Link to="/" className="flex items-center gap-2.5" data-testid="unsubscribe-brand-link"><span className="flex size-8 items-center justify-center rounded-full bg-[var(--terracotta)] text-[var(--on-accent)]"><PenLine size={16} /></span><span className="font-serif text-[23px] font-semibold tracking-[-0.04em]">journal<span className="text-[var(--terracotta)]">.</span></span></Link>
      <Link to="/login" className="text-sm font-semibold text-[var(--muted-ink)] underline decoration-[var(--line-strong)] underline-offset-8 transition-colors hover:text-[var(--terracotta)]" data-testid="unsubscribe-login-link">Log in</Link>
    </header>
    <main className="mx-auto max-w-xl px-6 pb-20 pt-10 text-center lg:pt-16">
      {state === "working" && <p className="text-sm text-[var(--muted-ink)]" data-testid="unsubscribe-working">Checking your link…</p>}
      {state === "done" && <>
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--sage-soft)] text-[var(--sage-deep)]"><BellOff size={22} /></span>
        <h1 className="display-heading mt-6 text-4xl" data-testid="unsubscribe-heading">No more nudges.</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[var(--muted-ink)]" data-testid="unsubscribe-copy">Daily reminders are off. Your pages stay exactly where they are — this changed nothing else.</p>
        <Link to="/" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--terracotta)] underline underline-offset-4" data-testid="unsubscribe-home-link"><ArrowLeft size={15} /> Back to journal</Link>
      </>}
      {state === "invalid" && <>
        <h1 className="display-heading mt-6 text-4xl" data-testid="unsubscribe-invalid-heading">This link has expired.</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[var(--muted-ink)]" data-testid="unsubscribe-invalid-copy">Unsubscribe links last 30 days. Log in and switch reminders off in Settings whenever you like.</p>
        <Link to="/login" className="mt-8 inline-flex text-sm font-semibold text-[var(--terracotta)] underline underline-offset-4" data-testid="unsubscribe-invalid-login-link">Log in to manage reminders</Link>
      </>}
    </main>
  </div>;
}
