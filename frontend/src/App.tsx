import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "@/components/AppShell";
import PageFade from "@/components/PageFade";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/lib/theme";

// Route-split: each page loads on first navigation, keeping the initial
// bundle to shell + vendor. Shared shell (AppShell, PageFade, Toaster) and
// framer-motion stay eager — motion is used by the shell itself.
const Ask = lazy(() => import("@/pages/Ask"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));
const Auth = lazy(() => import("@/pages/Auth"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const EntryDetail = lazy(() => import("@/pages/EntryDetail"));
const Insights = lazy(() => import("@/pages/Insights"));
const Landing = lazy(() => import("@/pages/Landing"));
const Settings = lazy(() => import("@/pages/Settings"));
const Timeline = lazy(() => import("@/pages/Timeline"));
const Today = lazy(() => import("@/pages/Today"));

function RouteFallback() {
  return (
    <main className="paper-noise flex min-h-svh items-center justify-center bg-[var(--linen)] px-6">
      <div className="h-2 w-24 animate-pulse rounded-full bg-[var(--terracotta-soft)]" />
    </main>
  );
}

export default function App() {
  const { theme } = useTheme();
  return (
    <>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<PageFade><Landing /></PageFade>} />
        <Route path="/login" element={<PageFade><Auth mode="login" /></PageFade>} />
        <Route path="/signup" element={<PageFade><Auth mode="signup" /></PageFade>} />
        <Route path="/unsubscribe" element={<PageFade><Unsubscribe /></PageFade>} />
        <Route path="/app" element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Today />} />
            <Route path="timeline" element={<Timeline />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="ask" element={<Ask />} />
            <Route path="insights" element={<Insights />} />
            <Route path="settings" element={<Settings />} />
            <Route path="entry/:id" element={<EntryDetail />} />
          </Route>
        </Route>
      </Routes>
      </Suspense>
      <Toaster position="bottom-right" richColors theme={theme} toastOptions={{ style: { background: "var(--paper)", color: "var(--ink)", border: "1px solid var(--line)" } }} />
    </>
  );
}
