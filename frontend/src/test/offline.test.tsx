import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { Route, Routes } from "react-router-dom";
import AppShell from "@/components/AppShell";
import Today from "@/pages/Today";
import { server } from "./server";
import { TODAY, db } from "./handlers";
import { loadDraft } from "@/lib/drafts";
import { enqueueWrite, flushQueue, loadQueue, queuedCount } from "@/lib/syncQueue";
import { renderApp } from "./utils";

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { value, configurable: true });
}

describe("Offline write queue", () => {
  it("flushes a queued write when back online", async () => {
    renderApp(<div data-testid="host">x</div>, "/app");
    enqueueWrite(
      { date: "2026-09-06", content: "Queued words.", mood: "calm", tags: [], backfilled: false },
      null
    );
    expect(queuedCount()).toBe(1);
    const result = await flushQueue();
    expect(result).toEqual({ flushed: 1, conflicts: 0 });
    expect(queuedCount()).toBe(0);
    expect(db.entries.some((e) => e.date === "2026-09-06" && e.content === "Queued words.")).toBe(true);
  });

  it("keeps the server page on conflict and preserves queued words as a draft", async () => {
    renderApp(<div data-testid="host">x</div>, "/app");
    enqueueWrite(
      { date: TODAY, content: "Stale offline edit.", mood: "calm", tags: [], backfilled: false },
      { content: "Something older entirely.", updatedAt: "2020-01-01T00:00:00.000Z" }
    );
    const result = await flushQueue();
    expect(result.conflicts).toBe(1);
    expect(queuedCount()).toBe(0);
    const serverEntry = db.entries.find((e) => e.date === TODAY);
    expect(serverEntry?.content).toContain("kitchen floor");
    expect(loadDraft(TODAY)?.content).toBe("Stale offline edit.");
  });

  it("does nothing while offline", async () => {
    renderApp(<div data-testid="host">x</div>, "/app");
    enqueueWrite(
      { date: "2026-09-06", content: "Waiting words.", mood: null, tags: [], backfilled: false },
      null
    );
    setOnline(false);
    try {
      expect(await flushQueue()).toEqual({ flushed: 0, conflicts: 0 });
      expect(queuedCount()).toBe(1);
    } finally {
      setOnline(true);
    }
  });

  it("queues a Today save when the network fails, then syncs on reconnect", async () => {
    server.use(http.put("/api/entries/date/:date", () => HttpResponse.error()));
    setOnline(false);
    try {
      renderApp(
        <Routes>
          <Route path="/app" element={<Today />} />
        </Routes>,
        "/app"
      );
      const editor = await screen.findByTestId("today-editor-textarea");
      const user = userEvent.setup();
      await user.clear(editor);
      await user.type(editor, "Offline words that must not be lost.");
      await waitFor(() => expect(screen.getByTestId("save-status-indicator")).toHaveTextContent("Will save when you return"), { timeout: 8000 });
      expect(queuedCount()).toBe(1);
    } finally {
      server.resetHandlers();
      setOnline(true);
    }
    const result = await flushQueue();
    expect(result.flushed).toBe(1);
    expect(loadQueue()).toHaveLength(0);
  });

  it("counts waiting pages in the offline pill", async () => {
    renderApp(
      <Routes>
        <Route path="/app" element={<AppShell />} />
      </Routes>,
      "/app"
    );
    await screen.findByTestId("journal-app-shell");
    enqueueWrite(
      { date: "2026-09-06", content: "Waiting.", mood: null, tags: [], backfilled: false },
      null
    );
    setOnline(false);
    try {
      window.dispatchEvent(new Event("offline"));
      expect(await screen.findByTestId("offline-pill")).toHaveTextContent("1 page waiting");
    } finally {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    }
  });
});
