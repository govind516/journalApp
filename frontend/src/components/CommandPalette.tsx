import { useEffect, useMemo, useState } from "react";
import { BookHeart, CalendarDays, Clock3, LineChart, Lock, MoonStar, PenLine, Search, Settings, Sun } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/lib/theme";

export type CommandAction =
  | { kind: "go"; label: string; hint: string; to: string; icon: typeof PenLine }
  | { kind: "theme"; label: string; hint: string; icon: typeof Sun }
  | { kind: "lock"; label: string; hint: string; icon: typeof Lock };

export default function CommandPalette({ open, onClose, onGo, onLock }: {
  open: boolean;
  onClose: () => void;
  onGo: (to: string) => void;
  onLock: () => void;
}) {
  const { theme, toggle } = useTheme();
  const [filter, setFilter] = useState("");
  const [cursor, setCursor] = useState(0);

  const actions: CommandAction[] = useMemo(() => [
    { kind: "go", label: "Write today’s page", hint: "Today", to: "/app", icon: PenLine },
    { kind: "go", label: "Search your pages", hint: "Timeline", to: "/app/timeline?focus=search", icon: Search },
    { kind: "go", label: "Ask your journal", hint: "Ask", to: "/app/ask", icon: BookHeart },
    { kind: "go", label: "Browse the timeline", hint: "Timeline", to: "/app/timeline", icon: Clock3 },
    { kind: "go", label: "See the year", hint: "Calendar", to: "/app/calendar", icon: CalendarDays },
    { kind: "go", label: "Read insights", hint: "Insights", to: "/app/insights", icon: LineChart },
    { kind: "go", label: "Open settings", hint: "Settings", to: "/app/settings", icon: Settings },
    { kind: "theme", label: theme === "dark" ? "Switch to daylight" : "Switch to lamplight", hint: "Theme", icon: theme === "dark" ? Sun : MoonStar },
    { kind: "lock", label: "Lock this device", hint: "Privacy", icon: Lock },
  ], [theme]);

  const visible = actions.filter((a) => `${a.label} ${a.hint}`.toLowerCase().includes(filter.toLowerCase()));

  useEffect(() => {
    if (open) { setFilter(""); setCursor(0); }
  }, [open ]);

  const run = (action: CommandAction) => {
    if (action.kind === "go") onGo(action.to);
    else if (action.kind === "theme") { toggle(); onClose(); }
    else { onLock(); onClose(); }
  };

  return <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
    <DialogContent data-testid="command-palette">
      <Input value={filter} onChange={(e) => { setFilter(e.target.value); setCursor(0); }} placeholder="Type a command…" aria-label="Commands" data-testid="command-palette-input" autoFocus
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, visible.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
          if (e.key === "Enter" && visible[cursor]) { e.preventDefault(); run(visible[cursor]); }
        }} />
      <div className="mt-2 max-h-72 overflow-y-auto" data-testid="command-palette-list">
        {visible.map((action, i) => <button key={action.label} onClick={() => run(action)} onMouseEnter={() => setCursor(i)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${i === cursor ? "bg-[var(--sand)]" : ""}`} data-testid={`command-${action.label.toLowerCase().replaceAll(" ", "-").replaceAll("’", "")}`}>
          <action.icon size={16} className="shrink-0 text-[var(--terracotta)]" />
          <span className="flex-1 font-medium text-[var(--ink-soft)]">{action.label}</span>
          <span className="text-[11px] text-[var(--muted-ink)]">{action.hint}</span>
        </button>)}
        {visible.length === 0 && <p className="px-3 py-6 text-center text-sm text-[var(--muted-ink)]" data-testid="command-palette-empty">Nothing matches — try “ask” or “today”.</p>}
      </div>
    </DialogContent>
  </Dialog>;
}
