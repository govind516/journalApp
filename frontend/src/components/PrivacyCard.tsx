import { useState } from "react";
import type { FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowDownToLine, FileJson, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiDelete } from "@/lib/api";
import { clearPinHash, getPinHash, hashPin, setPinHash } from "@/lib/lock";
import type { User } from "@/lib/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function PrivacyCard({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [hasPin, setHasPin] = useState(() => !!getPinHash(user.id));
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pinNote, setPinNote] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteWord, setDeleteWord] = useState("");
  const [deleting, setDeleting] = useState(false);

  const savePin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pin.length < 4 || pin !== confirm) {
      setPinNote(pin.length < 4 ? "A PIN needs at least 4 digits." : "The two PINs don’t match. Try again, gently.");
      return;
    }
    setPinHash(user.id, await hashPin(pin, user.id));
    setHasPin(true);
    setPin("");
    setConfirm("");
    setPinNote("This device now asks for a PIN. It never leaves this browser.");
  };

  const removePin = () => {
    clearPinHash(user.id);
    setHasPin(false);
    setPinNote("No PIN on this device anymore.");
  };

  const deleteEverything = async () => {
    setDeleting(true);
    try {
      await apiDelete<void>("/account");
      queryClient.clear();
      navigate("/");
    } finally {
      setDeleting(false);
    }
  };

  return <section className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 sm:p-8" data-testid="privacy-settings-card">
    <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-[var(--sand)] text-[var(--terracotta)]"><ShieldCheck size={17} /></span><div><h2 className="font-serif text-2xl" data-testid="privacy-settings-heading">Private by design</h2><p className="text-sm text-[var(--muted-ink)]" data-testid="privacy-settings-copy">Your pages live on your own server. Memory, Ask and reflections run on this machine from your words — nothing is sent anywhere.</p></div></div>

    <div className="mt-7 space-y-5">
      <div data-testid="pin-lock-row">
        <p className="text-sm font-semibold" data-testid="pin-lock-label">{hasPin ? "This device asks for a PIN" : "Lock this device with a PIN"}</p>
        {hasPin
          ? <div className="mt-3 flex flex-wrap items-center gap-3"><Button variant="outline" onClick={removePin} data-testid="remove-pin-button"><Lock size={15} /> Remove PIN</Button><span className="text-xs text-[var(--muted-ink)]">Unlocking lasts for this tab only.</span></div>
          : <form onSubmit={savePin} className="mt-3 flex max-w-md flex-col gap-3 sm:flex-row"><Input type="password" inputMode="numeric" maxLength={12} value={pin} onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Choose a PIN" aria-label="Choose a PIN" data-testid="new-pin-input" /><Input type="password" inputMode="numeric" maxLength={12} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Repeat it" aria-label="Repeat PIN" data-testid="confirm-pin-input" /><Button type="submit" data-testid="save-pin-button">Set PIN</Button></form>}
        {pinNote && <p className="mt-2 text-xs text-[var(--muted-ink)]" data-testid="pin-note">{pinNote}</p>}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-[var(--line)] pt-5" data-testid="export-row">
        <a href={`${API_BASE}/api/export/markdown`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--terracotta)] px-4 text-sm font-semibold text-[var(--on-accent)] transition-colors hover:bg-[var(--terracotta-deep)] hover:text-[var(--paper)]" data-testid="download-markdown-button"><ArrowDownToLine size={16} /> Markdown</a>
        <a href={`${API_BASE}/api/export/json`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line-strong)] px-4 text-sm font-semibold transition-colors hover:bg-[var(--sand)]" data-testid="download-json-button"><FileJson size={16} /> JSON</a>
      </div>

      <div className="border-t border-[var(--line)] pt-5" data-testid="danger-zone">
        <p className="text-sm font-semibold text-[var(--error-text)]" data-testid="danger-zone-label">Let everything go</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted-ink)]" data-testid="danger-zone-copy">Removes every page, session and setting for this account. There is no undo, so we ask twice.</p>
        <Button variant="ghost" className="mt-3 text-[var(--error-text)] hover:bg-[var(--error-bg)]" onClick={() => { setDeleteWord(""); setShowDelete(true); }} data-testid="delete-account-button"><Trash2 size={15} /> Delete my journal</Button>
      </div>
    </div>

    <Dialog open={showDelete} onOpenChange={setShowDelete}><DialogContent data-testid="delete-account-dialog"><DialogHeader><DialogTitle data-testid="delete-account-title">Really let it all go?</DialogTitle><DialogDescription data-testid="delete-account-copy">Type DELETE below to confirm. Every page disappears with it.</DialogDescription></DialogHeader><Input value={deleteWord} onChange={(e) => setDeleteWord(e.target.value)} placeholder="DELETE" aria-label="Type DELETE to confirm" data-testid="delete-confirm-input" /><DialogFooter><Button variant="ghost" onClick={() => setShowDelete(false)} data-testid="cancel-delete-account-button">Keep my journal</Button><Button variant="destructive" disabled={deleteWord !== "DELETE" || deleting} onClick={deleteEverything} data-testid="confirm-delete-account-button">{deleting ? "Deleting…" : "Delete everything"}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
