import { useState } from "react";
import type { FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiPost } from "@/lib/api";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export default function ImportCard() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const text = await file.text();
      const bytes = new TextEncoder().encode(text);
      let binary = "";
      for (const b of bytes) binary += String.fromCharCode(b);
      const data = await apiPost<ImportResult>("/import", {
        filename: file.name,
        format: format || undefined,
        contentBase64: btoa(binary),
      });
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["today"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["memory"] });
    } catch (caught) {
      if (caught instanceof ApiError && typeof caught.body === "object" && caught.body && "detail" in caught.body) setError(String(caught.body.detail));
      else setError("The import didn’t go through. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return <section className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-6 sm:p-8" data-testid="import-card">
    <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-[var(--sand)] text-[var(--terracotta)]"><FileUp size={17} /></span><div><h2 className="font-serif text-2xl" data-testid="import-heading">Bring old pages</h2><p className="text-sm text-[var(--muted-ink)]" data-testid="import-copy">Markdown, JSON, CSV or Day One. Days that already hold words are left alone.</p></div></div>
    <form onSubmit={submit} className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end" data-testid="import-form">
      <label className="field-label flex-1" data-testid="import-file-field">File<Input type="file" accept=".md,.markdown,.txt,.json,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} data-testid="import-file-input" /></label>
      <label className="field-label sm:w-40" data-testid="import-format-field">Format<select value={format} onChange={(e) => setFormat(e.target.value)} className="warm-select" data-testid="import-format-select"><option value="">From filename</option><option value="markdown">Markdown</option><option value="json">JSON</option><option value="csv">CSV</option><option value="dayone">Day One</option></select></label>
      <Button type="submit" disabled={busy || !file} data-testid="import-submit-button"><ArrowDownToLine size={16} /> {busy ? "Reading…" : "Import"}</Button>
    </form>
    {error && <p className="mt-4 rounded-xl bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]" role="alert" data-testid="import-error">{error}</p>}
    {result && <div className="mt-4 rounded-2xl bg-[var(--sand)] px-5 py-4 text-sm" data-testid="import-result">
      <p data-testid="import-summary">{result.imported} {result.imported === 1 ? "page" : "pages"} brought in{result.skipped > 0 ? `, ${result.skipped} already here` : ""}.</p>
      {result.errors.length > 0 && <ul className="mt-2 space-y-1 text-xs text-[var(--muted-ink)]" data-testid="import-errors">{result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}</ul>}
    </div>}
  </section>;
}
