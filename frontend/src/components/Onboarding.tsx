import { useState } from "react";
import { ArrowRight, BookHeart, PenLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const KEY = "journal-onboarded";

export function needsOnboarding(): boolean {
  try { return !window.localStorage.getItem(KEY); } catch { return false; }
}

const steps = [
  { icon: PenLine, title: "Write a few true sentences", copy: "There is no right length. Today’s page saves itself as you go." },
  { icon: BookHeart, title: "Your journal remembers", copy: "Threads, returning words and anniversaries surface on their own." },
  { icon: Sparkles, title: "Ask, then reflect", copy: "Ask about bright stretches, hard days, returning threads. Each month gathers itself." },
];

export default function Onboarding() {
  const [open, setOpen] = useState(needsOnboarding);
  const [step, setStep] = useState(0);
  const current = steps[step];

  const finish = () => {
    try { window.localStorage.setItem(KEY, "1"); } catch { /* private mode */ }
    setOpen(false);
  };

  return <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : finish())}>
    <DialogContent data-testid="onboarding-dialog">
      <DialogHeader>
        <DialogTitle data-testid="onboarding-title">A small place for the real days.</DialogTitle>
        <DialogDescription data-testid="onboarding-copy">Three quiet ideas, then today’s page is yours.</DialogDescription>
      </DialogHeader>
      <div className="flex items-start gap-4 rounded-2xl bg-[var(--sand)] px-5 py-5" data-testid={`onboarding-step-${step}`}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--terracotta)] text-[var(--on-accent)]"><current.icon size={18} /></span>
        <div>
          <p className="font-serif text-lg" data-testid="onboarding-step-title">{current.title}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-ink)]" data-testid="onboarding-step-copy">{current.copy}</p>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-1.5" data-testid="onboarding-dots">{steps.map((_, i) => <span key={i} className={`size-1.5 rounded-full ${i === step ? "bg-[var(--terracotta)]" : "bg-[var(--line-strong)]"}`} />)}</div>
        {step < steps.length - 1
          ? <Button onClick={() => setStep((s) => s + 1)} data-testid="onboarding-next-button">Continue <ArrowRight size={15} /></Button>
          : <Button onClick={finish} data-testid="onboarding-begin-button">Begin today’s page</Button>}
      </div>
    </DialogContent>
  </Dialog>;
}
