import { useState } from "react";
import type { FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost, ApiError } from "@/lib/api";
import { toUser } from "@/lib/normalize";

const timezones = ["UTC", "America/Los_Angeles", "America/New_York", "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"];

export default function Auth({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [timezone, setTimezone] = useState(timezones.includes(detectedTimezone) ? detectedTimezone : "UTC");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const raw = isSignup
        ? await apiPost<Record<string, unknown>>("/auth/signup", { name, email, password, timezone })
        : await apiPost<Record<string, unknown>>("/auth/login", { email, password });
      queryClient.setQueryData(["me"], toUser(raw));
      navigate("/app");
    } catch (caught) {
      if (caught instanceof ApiError && typeof caught.body === "object" && caught.body && "detail" in caught.body) setError(String(caught.body.detail));
      else setError("Something interrupted the page. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="paper-noise grid min-h-svh bg-[var(--linen)] text-[var(--ink)] lg:grid-cols-[0.9fr_1.1fr]" data-testid={`${mode}-page`}>
    <section className="relative hidden overflow-hidden bg-[var(--terracotta)] p-12 text-[var(--on-accent)] lg:flex lg:flex-col lg:justify-between" data-testid="auth-quote-panel"><Link to="/" className="flex items-center gap-2.5" data-testid="auth-brand-link"><span className="flex size-8 items-center justify-center rounded-full bg-[var(--on-accent)]/15"><PenLine size={16} /></span><span className="font-serif text-[23px] font-semibold">journal<span className="opacity-60">.</span></span></Link><div className="relative z-10 max-w-md"><p className="font-serif text-5xl leading-[1.05]" data-testid="auth-quote">“The life you pay attention to is the life you get.”</p><p className="mt-6 text-sm opacity-70" data-testid="auth-quote-attribution">— William James, adapted</p></div><div className="flex items-center gap-2 text-xs opacity-70" data-testid="auth-privacy-copy"><span className="size-1.5 rounded-full bg-[var(--on-accent)]" /> A private place for your thoughts</div><div className="absolute -right-24 -bottom-32 size-80 rounded-full border border-[var(--on-accent)]/15" data-testid="auth-decorative-circle" /></section>
    <section className="flex items-center justify-center px-6 py-12 sm:px-12" data-testid="auth-form-panel"><div className="w-full max-w-md"><Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden" data-testid="auth-brand-link-mobile"><span className="flex size-8 items-center justify-center rounded-full bg-[var(--terracotta)] text-[var(--on-accent)]"><PenLine size={16} /></span><span className="font-serif text-[23px] font-semibold tracking-[-0.04em]">journal<span className="text-[var(--terracotta)]">.</span></span></Link><Link to="/" className="mb-14 inline-flex items-center gap-2 text-sm text-[var(--muted-ink)] transition-colors hover:text-[var(--terracotta)]" data-testid="auth-back-link"><ArrowLeft size={15} /> Back to journal</Link><p className="eyebrow" data-testid="auth-eyebrow">{isSignup ? "Begin here" : "Welcome back"}</p><h1 className="display-heading mt-4 text-balance text-[32px] leading-[1.08] sm:text-5xl" data-testid="auth-heading">{isSignup ? "Make room for your thoughts." : "Good to see you again."}</h1><p className="mt-4 text-base leading-7 text-[var(--muted-ink)]" data-testid="auth-description">{isSignup ? "A few details, then today’s page is waiting for you." : "Your pages have been keeping the light on."}</p>
      <form onSubmit={submit} className="mt-10 space-y-5" data-testid={`${mode}-form`}>
        {isSignup && <label className="field-label" data-testid="signup-name-field">Your name<Input value={name} onChange={(event) => setName(event.target.value)} placeholder="What should we call you?" required data-testid="signup-name-input" /></label>}
        <label className="field-label" data-testid={`${mode}-email-field`}>Email address<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required data-testid={`${mode}-email-input`} /></label>
        <label className="field-label" data-testid={`${mode}-password-field`}>Password<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? "At least 8 characters" : "Your password"} minLength={isSignup ? 8 : undefined} required data-testid={`${mode}-password-input`} /></label>
        {isSignup && <label className="field-label" data-testid="signup-timezone-field">Your timezone<span className="text-[11px] font-normal normal-case tracking-normal text-[var(--muted-ink)]"> We detected {detectedTimezone}</span><select value={timezone} onChange={(event) => setTimezone(event.target.value)} className="warm-select" data-testid="signup-timezone-select">{timezones.map((zone) => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}</select></label>}
        {error && <p className="rounded-xl bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]" role="alert" data-testid="auth-error-message">{error}</p>}
        <Button type="submit" size="lg" disabled={submitting} className="mt-2 h-11 w-full" data-testid={`${mode}-submit-button`}>{submitting ? "Opening your pages…" : isSignup ? <>Start writing <ArrowRight size={16} /></> : "Open my journal"}</Button>
      </form>
      <p className="mt-8 text-center text-sm text-[var(--muted-ink)]" data-testid="auth-switch-copy">{isSignup ? "Already have a journal?" : "New here?"} <Link to={isSignup ? "/login" : "/signup"} className="font-semibold text-[var(--terracotta)] underline underline-offset-4" data-testid="auth-switch-link">{isSignup ? "Log in" : "Create an account"}</Link></p>
    </div></section>
  </div>;
}
