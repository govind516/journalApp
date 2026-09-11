import { ArrowRight, CalendarDays, Flame, History, PenLine, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";

const features = [
  { icon: Sparkles, title: "A thought to begin with", copy: "A small daily prompt when the blank page feels too loud." },
  { icon: Flame, title: "A gentle rhythm", copy: "Notice the days you return, without turning reflection into a score." },
  { icon: History, title: "Your story, over time", copy: "Find the words you wrote on an ordinary day years ago." },
  { icon: CalendarDays, title: "A shape to your year", copy: "See a quiet constellation of the days you made time for yourself." },
];

export default function Landing() {
  return <div className="paper-noise min-h-svh overflow-hidden bg-[var(--linen)] text-[var(--ink)]" data-testid="landing-page">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-10" data-testid="landing-header">
      <Link to="/" className="flex items-center gap-2.5" data-testid="landing-brand-link"><span className="flex size-8 items-center justify-center rounded-full bg-[var(--terracotta)] text-[var(--on-accent)]"><PenLine size={16} /></span><span className="font-serif text-[23px] font-semibold tracking-[-0.04em]">journal<span className="text-[var(--terracotta)]">.</span></span></Link>
      <nav className="flex items-center gap-2" data-testid="landing-auth-navigation"><Link to="/login" className={buttonVariants({ variant: "ghost", size: "sm" })} data-testid="landing-login-link">Log in</Link><Link to="/signup" className={buttonVariants({ size: "sm", className: "bg-[var(--terracotta)] text-[var(--on-accent)] hover:bg-[var(--terracotta-deep)] hover:text-[var(--paper)]" })} data-testid="landing-signup-link">Start writing <ArrowRight size={14} /></Link></nav>
    </header>
    <main className="mx-auto max-w-7xl px-6 pb-20 pt-8 lg:px-10 lg:pt-20">
      <section className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]" data-testid="landing-hero-section">
        <div className="max-w-xl animate-fade-up" data-testid="landing-hero-copy">
          <p className="eyebrow mb-6 flex items-center gap-2" data-testid="landing-eyebrow"><span className="size-1.5 rounded-full bg-[var(--terracotta)]" /> A quieter way to think</p>
          <h1 className="display-heading text-balance text-[44px] leading-[1.0] sm:text-6xl lg:text-[76px]" data-testid="landing-headline">The habit that makes you a <em>better thinker.</em></h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-[var(--muted-ink)]" data-testid="landing-supporting-copy">Not another blank page. A warm place to meet your own thoughts, one honest day at a time.</p>
          <div className="mt-9 flex flex-wrap items-center gap-4" data-testid="landing-hero-actions"><Link to="/signup" className={buttonVariants({ size: "lg", className: "bg-[var(--terracotta)] px-6 text-[var(--on-accent)] hover:bg-[var(--terracotta-deep)] hover:text-[var(--paper)]" })} data-testid="landing-start-writing-button">Start writing <ArrowRight size={17} /></Link><Link to="/login" className="text-sm font-semibold text-[var(--muted-ink)] underline decoration-[var(--line-strong)] underline-offset-8 transition-colors hover:text-[var(--terracotta)]" data-testid="landing-existing-account-link">I already have an account</Link></div>
          <p className="mt-8 flex items-center gap-2 text-xs text-[var(--muted-ink)]" data-testid="landing-privacy-note"><span className="size-1.5 rounded-full bg-[var(--sage)]" /> Private by design · yours to keep</p>
        </div>
        <div className="relative animate-float-soft pt-10 lg:pt-0" data-testid="landing-writing-preview">
          <div className="absolute -top-8 right-0 z-10 flex items-center gap-2 rounded-full border border-[var(--line)] theme-card-overlay px-4 py-2.5 shadow-[var(--shadow-sm)]" data-testid="landing-streak-preview"><Flame size={16} className="text-[var(--ochre)]" fill="currentColor" /><span className="text-xs font-bold tracking-wide">12 day streak</span></div>
          <div className="relative mx-auto max-w-[570px] rotate-[1.5deg] rounded-[28px] border border-[var(--line)] bg-[var(--paper)] p-7 shadow-[var(--shadow-lg)] sm:p-11" data-testid="landing-entry-preview-card">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-6"><div><p className="eyebrow" data-testid="preview-date-label">Thursday, October 24</p><p className="mt-2 font-serif text-2xl" data-testid="preview-title">A little more present</p></div><span className="rounded-full bg-[var(--sage-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--sage-deep)]" data-testid="preview-saved-label">Saved</span></div>
            <p className="mt-8 font-serif text-xl italic leading-8 text-[var(--muted-ink)]" data-testid="preview-prompt">What made you pause today?</p>
            <p className="mt-6 max-w-lg font-serif text-xl leading-9 text-[var(--ink-soft)]" data-testid="preview-entry-copy">I noticed the light on the kitchen floor this morning. Nothing important was happening, which might be why I finally noticed it.</p>
            <div className="mt-9 flex items-center justify-between border-t border-[var(--line)] pt-5 text-xs text-[var(--muted-ink)]"><span data-testid="preview-word-count">42 words</span><span className="flex items-center gap-2" data-testid="preview-mood-label">mood <span className="rounded-full bg-[var(--mood-grateful-bg)] px-2 py-1 text-[var(--mood-grateful-text)]">♡ grateful</span></span></div>
          </div>
          <div className="absolute -bottom-7 -left-5 -z-0 size-28 rounded-full bg-[var(--terracotta-soft)] blur-2xl" data-testid="landing-decorative-orb" />
        </div>
      </section>
      <section className="mt-28 border-t border-[var(--line)] pt-8" data-testid="landing-features-section"><div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><p className="eyebrow" data-testid="features-eyebrow">A practice, not a performance</p><p className="max-w-sm text-sm leading-6 text-[var(--muted-ink)]" data-testid="features-intro">Make space for the details that usually pass by unnoticed.</p></div><div className="grid gap-px overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">{features.map(({ icon: Icon, title, copy }) => <article key={title} className="group bg-[var(--paper)] p-7 transition-colors hover:bg-[var(--sand)]" data-testid={`feature-card-${title.toLowerCase().replaceAll(" ", "-")}`}><Icon size={20} strokeWidth={1.5} className="text-[var(--terracotta)] transition-transform duration-300 group-hover:-translate-y-1" /><h2 className="mt-8 font-serif text-xl" data-testid={`feature-title-${title.toLowerCase().replaceAll(" ", "-")}`}>{title}</h2><p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]" data-testid={`feature-copy-${title.toLowerCase().replaceAll(" ", "-")}`}>{copy}</p></article>)}</div></section>
    </main>
    <footer className="mx-auto flex max-w-7xl items-center justify-between border-t border-[var(--line)] px-6 py-7 text-xs text-[var(--muted-ink)] lg:px-10" data-testid="landing-footer"><span data-testid="landing-footer-copy">A small place for the real days.</span><span data-testid="landing-footer-privacy">Your entries belong to you.</span></footer>
  </div>;
}
