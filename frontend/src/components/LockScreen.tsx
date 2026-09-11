import { useState } from "react";
import type { FormEvent } from "react";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearPinHash, getPinHash, hashPin, markUnlocked } from "@/lib/lock";
import type { User } from "@/lib/types";

export default function LockScreen({ user, onUnlock, onSignOut }: { user: User; onUnlock: () => void; onSignOut: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChecking(true);
    setError("");
    const expected = getPinHash(user.id);
    const actual = await hashPin(pin, user.id);
    if (expected && actual === expected) {
      markUnlocked(user.id);
      onUnlock();
    } else {
      setError("That PIN didn’t match. Try again, gently.");
    }
    setChecking(false);
    setPin("");
  };

  return <div className="paper-noise flex min-h-svh items-center justify-center bg-[var(--linen)] px-6" data-testid="lock-screen">
    <div className="w-full max-w-sm rounded-[28px] border border-[var(--line)] bg-[var(--paper)] p-8 text-center shadow-[var(--shadow-lg)]" data-testid="lock-card">
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-[var(--terracotta)] text-[var(--on-accent)]"><PenLine size={18} /></span>
      <p className="eyebrow mt-6" data-testid="lock-eyebrow">A locked journal</p>
      <h1 className="display-heading mt-3 text-3xl" data-testid="lock-heading">Welcome back, {user.name.split(" ")[0]}.</h1>
      <p className="mt-2 text-sm text-[var(--muted-ink)]" data-testid="lock-copy">Enter this device’s PIN to open your pages.</p>
      <form onSubmit={submit} className="mt-7 space-y-4" data-testid="lock-form">
        <Input type="password" inputMode="numeric" autoComplete="off" maxLength={12} value={pin} onChange={(event) => setPin(event.target.value.replace(/[^0-9]/g, ""))} placeholder="••••" required className="h-12 text-center text-xl tracking-[0.5em]" data-testid="lock-pin-input" aria-label="Device PIN" autoFocus />
        {error && <p className="text-sm text-[var(--error-text)]" role="alert" data-testid="lock-error">{error}</p>}
        <Button type="submit" disabled={checking || pin.length < 4} className="h-11 w-full" data-testid="lock-unlock-button">{checking ? "Checking…" : "Open my journal"}</Button>
      </form>
      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-[var(--muted-ink)]">
        <button onClick={() => { clearPinHash(user.id); onUnlock(); }} className="underline underline-offset-4 hover:text-[var(--terracotta)]" data-testid="lock-forget-button">Forget PIN on this device</button>
        <span aria-hidden="true">·</span>
        <button onClick={onSignOut} className="underline underline-offset-4 hover:text-[var(--terracotta)]" data-testid="lock-sign-out-button">Sign out</button>
      </div>
    </div>
  </div>;
}
