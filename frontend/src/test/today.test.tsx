import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HttpResponse, delay, http } from "msw";
import { Route, Routes } from "react-router-dom";
import Today from "@/pages/Today";
import { renderApp } from "./utils";
import { server } from "./server";
import { TODAY } from "./handlers";

function renderToday() {
  return renderApp(
    <Routes>
      <Route path="/app" element={<Today />} />
    </Routes>,
    "/app"
  );
}

describe("Today editor", () => {
  it("loads the server entry and autosaves edits", async () => {
    const user = userEvent.setup();
    renderToday();
    const editor = await screen.findByTestId("today-editor-textarea");
    await waitFor(() => expect((editor as HTMLTextAreaElement).value).toContain("kitchen floor"));

    await user.clear(editor);
    await user.type(editor, "Fresh words for today.");
    await waitFor(() => expect(screen.getByTestId("save-status-indicator")).toHaveTextContent("Saved just now"), { timeout: 5000 });
    expect(screen.getByTestId("word-count-indicator")).toHaveTextContent("4 words");
  });

  it("shows Saving… while the save is in flight", async () => {
    server.use(http.put("/api/entries/date/:date", async () => {
      await delay(600);
      return HttpResponse.json({ detail: "slow" }, { status: 500 });
    }));
    const user = userEvent.setup();
    renderToday();
    const editor = await screen.findByTestId("today-editor-textarea");
    await waitFor(() => expect((editor as HTMLTextAreaElement).value).toContain("kitchen floor"));
    await user.clear(editor);
    await user.type(editor, "Slow words.");
    await waitFor(() => expect(screen.getByTestId("save-status-indicator")).toHaveTextContent("Saving…"), { timeout: 5000 });
  });

  it("recovers an unsent draft only when the server holds nothing", async () => {
    window.localStorage.setItem(
      `journal-draft-${TODAY}`,
      JSON.stringify({ content: "Unsent words from a crash.", mood: null, tags: [], updatedAt: Date.now() })
    );
    renderToday();
    // Server entry exists, so the draft must NOT clobber it.
    const editor = await screen.findByTestId("today-editor-textarea");
    await waitFor(() => expect((editor as HTMLTextAreaElement).value).toContain("kitchen floor"));
    expect(screen.queryByTestId("draft-recovered-note")).not.toBeInTheDocument();
  });

  it("recovers a draft for an empty day and discards it on request", async () => {
    const user = userEvent.setup();
    renderApp(
      <Routes>
        <Route path="/app" element={<Today />} />
      </Routes>,
      '/app',
      'user-1',
      (db) => { db.entries = db.entries.filter((e) => e.date !== TODAY); }
    );
    window.localStorage.setItem(
      `journal-draft-${TODAY}`,
      JSON.stringify({ content: "Unsent words from a crash.", mood: "calm", tags: [], updatedAt: Date.now() })
    );
    expect(await screen.findByTestId("draft-recovered-note")).toBeInTheDocument();
    const editor = screen.getByTestId("today-editor-textarea") as HTMLTextAreaElement;
    expect(editor.value).toBe("Unsent words from a crash.");

    await user.click(screen.getByTestId("discard-draft-button"));
    expect(screen.queryByTestId("draft-recovered-note")).not.toBeInTheDocument();
    expect(editor).toHaveValue("");
  });

  it("ignores stale drafts older than a week", async () => {
    renderApp(
      <Routes>
        <Route path="/app" element={<Today />} />
      </Routes>,
      '/app',
      'user-1',
      (db) => { db.entries = db.entries.filter((e) => e.date !== TODAY); }
    );
    window.localStorage.setItem(
      `journal-draft-${TODAY}`,
      JSON.stringify({ content: "Ancient words.", mood: null, tags: [], updatedAt: Date.now() - 8 * 86400000 })
    );
    await screen.findByTestId("today-editor-textarea");
    await waitFor(() => expect(screen.queryByTestId("draft-recovered-note")).not.toBeInTheDocument());
    expect(window.localStorage.getItem(`journal-draft-${TODAY}`)).toBeNull();
  });

  it("toggles focus mode and hides the sidebar", async () => {
    const user = userEvent.setup();
    renderToday();
    await screen.findByTestId("today-editor-textarea");
    expect(screen.getByTestId("today-sidebar")).toBeInTheDocument();
    await user.click(screen.getByTestId("focus-mode-toggle"));
    expect(screen.queryByTestId("today-sidebar")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("journal-focus")).toBe("1");
  });

  it("shows the memory strip with source links", async () => {
    renderToday();
    expect(await screen.findByTestId("today-memory-card")).toBeInTheDocument();
    const card = screen.getByTestId("today-memory-card");
    const links = within(card).getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].getAttribute("href")).toContain("/app/timeline");
  });

  it("saves immediately on Cmd+S", async () => {
    renderToday();
    const editor = await screen.findByTestId("today-editor-textarea");
    fireEvent.change(editor, { target: { value: "Cmd+S words here now." } });
    fireEvent.keyDown(window, { key: "s", metaKey: true });
    await waitFor(() => expect(screen.getByTestId("save-status-indicator")).toHaveTextContent("Saved just now"), { timeout: 5000 });
  });
});
