import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "@/components/AppShell";
import PageFade from "@/components/PageFade";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/lib/theme";
import Ask from "@/pages/Ask";
import Unsubscribe from "@/pages/Unsubscribe";
import Auth from "@/pages/Auth";
import Calendar from "@/pages/Calendar";
import EntryDetail from "@/pages/EntryDetail";
import Insights from "@/pages/Insights";
import Landing from "@/pages/Landing";
import Settings from "@/pages/Settings";
import Timeline from "@/pages/Timeline";
import Today from "@/pages/Today";

export default function App() {
  const { theme } = useTheme();
  return (
    <>
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
      <Toaster position="bottom-right" richColors theme={theme} toastOptions={{ style: { background: "var(--paper)", color: "var(--ink)", border: "1px solid var(--line)" } }} />
    </>
  );
}
