import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookHeart,
  CalendarDays,
  Clock3,
  LineChart,
  Lock,
  LogOut,
  Menu,
  MoonStar,
  PenLine,
  Search,
  Settings,
  Sun,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import CommandPalette from "@/components/CommandPalette";
import EmberMark from "@/components/EmberMark";
import LockScreen from "@/components/LockScreen";
import Onboarding from "@/components/Onboarding";
import PageFade from "@/components/PageFade";
import { fetchMe, signOut } from "@/lib/session";
import { getPinHash, isUnlocked, lockNow } from "@/lib/lock";
import { flushQueue, queuedCount, subscribeQueue } from "@/lib/syncQueue";
import { useTheme } from "@/lib/theme";

const navigation = [
  { to: "/app", label: "Today", icon: PenLine, end: true, testId: "nav-today-link" },
  { to: "/app/timeline", label: "Timeline", icon: Clock3, end: false, testId: "nav-timeline-link" },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays, end: false, testId: "nav-calendar-link" },
  { to: "/app/ask", label: "Ask", icon: BookHeart, end: false, testId: "nav-ask-link" },
  { to: "/app/insights", label: "Insights", icon: LineChart, end: false, testId: "nav-insights-link" },
];

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [queued, setQueued] = useState(() => queuedCount());
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const { theme, toggle } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (event.key === "/" && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        navigate("/app/timeline?focus=search");
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void flushQueue();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const unsubscribe = subscribeQueue(() => setQueued(queuedCount()));
    setQueued(queuedCount());
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) setLocked(!!getPinHash(user.id) && !isUnlocked(user.id));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    queryClient.clear();
    navigate("/");
  };

  const handleLockNow = () => {
    if (!user) return;
    if (getPinHash(user.id)) {
      lockNow(user.id);
      setLocked(true);
    } else {
      navigate("/app/settings");
    }
  };

  if (user && locked) {
    return <LockScreen user={user} onUnlock={() => setLocked(false)} onSignOut={handleSignOut} />;
  }

  return (
    <div className="paper-noise min-h-svh bg-[var(--linen)] text-[var(--ink)]" data-testid="journal-app-shell">
      <aside className="theme-overlay fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--line)] px-6 py-7 backdrop-blur-xl lg:flex" data-testid="desktop-sidebar">
        <NavBrand />
        <div className="mt-14 flex flex-1 flex-col">
          <p className="eyebrow mb-4 px-3" data-testid="sidebar-navigation-label">Your journal</p>
          <nav className="space-y-1" data-testid="desktop-navigation">
            {navigation.map((item) => <NavigationItem key={item.to} {...item} pillId="nav-active-desktop" />)}
          </nav>
          <div className="mt-auto border-t border-[var(--line)] pt-5">
            <NavLink to="/app/settings" data-testid="nav-settings-link" className={({ isActive }) => navClass(isActive)}>
              <Settings size={17} strokeWidth={1.7} /> Settings
            </NavLink>
            <button
              className="nav-item mt-1 w-full"
              onClick={toggle}
              data-testid="theme-toggle-button"
              aria-label={theme === "dark" ? "Switch to daytime pages" : "Switch to lamplight pages"}
            >
              {theme === "dark" ? <Sun size={17} strokeWidth={1.7} /> : <MoonStar size={17} strokeWidth={1.7} />}
              {theme === "dark" ? "Daylight" : "Lamplight"}
            </button>
            <button className="nav-item mt-1 w-full" onClick={handleLockNow} data-testid="lock-now-button" aria-label="Lock this device">
              <Lock size={17} strokeWidth={1.7} /> Lock
            </button>
            <button className="nav-item mt-1 w-full" onClick={handleSignOut} data-testid="sign-out-button">
              <LogOut size={17} strokeWidth={1.7} /> Sign out
            </button>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[var(--sand)] px-3 py-3" data-testid="sidebar-user-card">
          <div className="flex size-9 items-center justify-center rounded-full bg-[var(--terracotta)] text-[var(--on-accent)]" data-testid="sidebar-user-avatar">{user?.name?.[0]?.toUpperCase() ?? "J"}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" data-testid="sidebar-user-name">{user?.name ?? "Your journal"}</p>
            <p className="truncate text-xs text-[var(--muted-ink)]" data-testid="sidebar-user-timezone">{user?.timezone ?? "Personal space"}</p>
          </div>
        </div>
      </aside>

      <header className="theme-overlay sticky top-0 z-20 flex items-center justify-between border-b border-[var(--line)] px-5 py-4 backdrop-blur-xl lg:hidden" data-testid="mobile-header">
        <NavBrand compact />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggle} data-testid="mobile-theme-toggle-button" aria-label={theme === "dark" ? "Switch to daytime pages" : "Switch to lamplight pages"}>
            {theme === "dark" ? <Sun size={20} /> : <MoonStar size={20} />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen((value) => !value)} data-testid="mobile-menu-toggle-button" aria-label="Open navigation">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </header>
      <AnimatePresence initial={false}>
      {menuOpen && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: [0.22, 0.8, 0.24, 1] }} className="overflow-hidden border-b border-[var(--line)] bg-[var(--paper)] lg:hidden" data-testid="mobile-navigation-panel">
        <nav className="grid gap-1 px-5 py-4" data-testid="mobile-navigation">
          {navigation.map((item) => <NavigationItem key={item.to} {...item} onNavigate={() => setMenuOpen(false)} />)}
          <NavLink to="/app/settings" onClick={() => setMenuOpen(false)} data-testid="mobile-settings-link" className={({ isActive }) => navClass(isActive)}><Settings size={17} /> Settings</NavLink>
          <button className="nav-item" onClick={handleSignOut} data-testid="mobile-sign-out-button"><LogOut size={17} /> Sign out</button>
        </nav>
      </motion.div>}
      </AnimatePresence>

      <main className="min-h-[calc(100svh-73px)] lg:ml-64" data-testid="journal-main-content">
        <AnimatePresence mode="wait" initial={false}>
          <PageFade key={location.pathname}>
            <Outlet />
          </PageFade>
        </AnimatePresence>
      </main>
      <div className="theme-card-overlay fixed right-5 bottom-5 hidden items-center gap-2 rounded-full border border-[var(--line)] px-3 py-2 text-xs text-[var(--muted-ink)] shadow-sm backdrop-blur-md xl:flex" data-testid="search-shortcut-hint">      <Search size={13} /> Press <kbd className="kbd">⌘ K</kbd> for commands</div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onGo={(to) => { setPaletteOpen(false); navigate(to); }} onLock={() => handleLockNow()} />
      <Onboarding />
      {(!online || queued > 0) && <div className="theme-card-overlay fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[var(--line-strong)] px-4 py-2 text-xs font-semibold whitespace-nowrap max-sm:left-4 max-sm:right-4 max-sm:translate-x-0 max-sm:whitespace-normal max-sm:text-center text-[var(--ink-soft)] shadow-[var(--shadow-md)] backdrop-blur-md" role="status" data-testid="offline-pill">{!online ? (queued > 0 ? `You’re offline — ${queued} ${queued === 1 ? "page" : "pages"} waiting to save.` : "You’re offline — new words will keep, and save when you return.") : `Back online — ${queued} ${queued === 1 ? "page" : "pages"} waiting to save.`}</div>}
      <span className="sr-only" data-testid="current-route-label">{location.pathname}</span>
    </div>
  );
}

function NavBrand({ compact = false }: { compact?: boolean }) {
  return <NavLink to="/app" className={`flex items-center gap-2.5 ${compact ? "" : "px-3"}`} data-testid={compact ? "mobile-brand-link" : "sidebar-brand-link"}>
    <span className="flex size-8 items-center justify-center rounded-full bg-[var(--terracotta)] text-[var(--on-accent)]"><PenLine size={16} /></span>
    <span className="font-serif text-[22px] font-semibold tracking-[-0.03em]">journal<span className="text-[var(--terracotta)]">.</span></span>
  </NavLink>;
}

function NavigationItem({ to, label, icon: Icon, end, testId, onNavigate, pillId }: { to: string; label: string; icon: LucideIcon; end: boolean; testId: string; onNavigate?: () => void; pillId?: string }) {
  return <NavLink to={to} end={end} onClick={onNavigate} data-testid={testId} className={({ isActive }) => pillId ? `nav-item relative ${isActive ? "text-[var(--terracotta-deep)]" : ""}` : navClass(isActive)}>
    {({ isActive }) => <>
      {isActive && pillId && <motion.span layoutId={pillId} transition={{ type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-xl bg-[var(--terracotta-soft)]" aria-hidden="true" />}
      <span className="relative flex items-center gap-[11px]"><Icon size={17} strokeWidth={1.7} /> {label}</span>
    </>}
  </NavLink>;
}

function navClass(isActive: boolean) {
  return `nav-item ${isActive ? "nav-item-active" : ""}`;
}

export { navigation };
