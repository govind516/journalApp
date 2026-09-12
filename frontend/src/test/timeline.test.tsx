import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Route, Routes } from "react-router-dom";
import Timeline from "@/pages/Timeline";
import EntryDetail from "@/pages/EntryDetail";
import Calendar from "@/pages/Calendar";
import AppShell from "@/components/AppShell";
import { renderApp } from "./utils";

function renderTimeline(route = "/app/timeline") {
  return renderApp(
    <Routes>
      <Route path="/app/timeline" element={<Timeline />} />
      <Route path="/app/entry/:id" element={<div data-testid="entry-stub">entry</div>} />
    </Routes>,
    route
  );
}

describe("Timeline", () => {
  it("groups entries by month and marks the longest page", async () => {
    renderTimeline();
    expect(await screen.findByTestId("timeline-month-group-2026-09")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-month-group-2026-08")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-entry-count")).toHaveTextContent("4 pages");
    // entry-1 is the longest September page (>= 40 words).
    expect(screen.getByTestId("timeline-moment-entry-1")).toHaveTextContent("A longer page");
  });

  it("shows relative dates for recent entries", async () => {
    renderTimeline();
    const card = await screen.findByTestId("timeline-entry-entry-1");
    expect(within(card).getByTestId("timeline-entry-date-entry-1").textContent).toMatch(/Today|Yesterday|weekday|[A-Z][a-z]+ \d/);
  });

  it("filters by search and clears", async () => {
    const user = userEvent.setup();
    renderTimeline();
    await screen.findByTestId("timeline-entry-entry-1");
    await user.type(screen.getByTestId("timeline-search-input"), "deadline");
    await waitFor(() => expect(screen.getByTestId("timeline-entry-count")).toHaveTextContent("1 pages"));
    await user.click(screen.getByTestId("clear-timeline-filters-button"));
    await waitFor(() => expect(screen.getByTestId("timeline-entry-count")).toHaveTextContent("4 pages"));
  });

  it("shows the empty state for an empty journal", async () => {
    renderApp(
      <Routes>
        <Route path="/app/timeline" element={<Timeline />} />
      </Routes>,
      '/app/timeline',
      'user-1',
      (db) => { db.entries = []; }
    );
    expect(await screen.findByTestId("timeline-empty-state")).toBeInTheDocument();
  });
});

describe("Calendar", () => {
  it("renders the year grid with real activity", async () => {
    renderApp(
      <Routes>
        <Route path="/app/calendar" element={<Calendar />} />
      </Routes>,
      "/app/calendar"
    );
    expect(await screen.findByTestId("calendar-month-9")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-month-12")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("calendar-written-count")).toHaveTextContent("3 written days"));
    expect(screen.getByTestId("calendar-zoom-hint")).toHaveTextContent("choose a month");
    expect(screen.getByTestId("calendar-year-label")).toHaveTextContent(String(new Date().getFullYear()));
  });

  it("shows a guided caption for an empty year", async () => {
    renderApp(
      <Routes>
        <Route path="/app/calendar" element={<Calendar />} />
      </Routes>,
      "/app/calendar",
      "user-1",
      (db) => { db.entries = []; }
    );
    expect(await screen.findByTestId("calendar-month-9")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("calendar-written-count")).toHaveTextContent("0 written days"));
    expect(screen.getByTestId("calendar-empty-caption")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-empty-action").getAttribute("href")).toBe("/app");
  });

  it("zooms into a month with numbered, navigable days", async () => {
    const user = userEvent.setup();
    renderApp(
      <Routes>
        <Route path="/app/calendar" element={<Calendar />} />
        <Route path="/app/today" element={<div data-testid="today-stub">today</div>} />
      </Routes>,
      "/app/calendar"
    );
    await screen.findByTestId("calendar-month-9");
    await user.click(screen.getByTestId("calendar-zoom-month-9"));
    expect(await screen.findByTestId("calendar-month-zoom")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-zoom-heading")).toHaveTextContent("Sep");
    expect(screen.getByTestId("calendar-zoom-weekdays")).toHaveTextContent("Mon");
    expect(screen.queryByTestId("calendar-month-grid")).not.toBeInTheDocument();
    const year = new Date().getFullYear();
    const day = screen.getByTestId(`calendar-day-${year}-09-15`);
    expect(day).toHaveTextContent("15");
    await user.click(screen.getByTestId("calendar-zoom-back"));
    expect(await screen.findByTestId("calendar-month-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("calendar-month-zoom")).not.toBeInTheDocument();
  });

  it("opens the backfill composer from a zoomed empty day", async () => {
    const user = userEvent.setup();
    const year = new Date().getFullYear() - 1;
    renderApp(
      <Routes>
        <Route path="/app/calendar" element={<Calendar />} />
        <Route path="/app/today" element={<div data-testid="today-stub">today</div>} />
      </Routes>,
      "/app/calendar"
    );
    await screen.findByTestId("calendar-month-9");
    await user.click(screen.getByTestId("calendar-previous-year-button"));
    await user.click(screen.getByTestId("calendar-zoom-month-12"));
    await user.click(screen.getByTestId(`calendar-day-${year}-12-15`));
    expect(await screen.findByTestId("today-stub")).toBeInTheDocument();
  });

  it("leaves zoom mode on year change", async () => {
    const user = userEvent.setup();
    renderApp(
      <Routes>
        <Route path="/app/calendar" element={<Calendar />} />
      </Routes>,
      "/app/calendar"
    );
    await screen.findByTestId("calendar-month-9");
    await user.click(screen.getByTestId("calendar-zoom-month-9"));
    expect(await screen.findByTestId("calendar-month-zoom")).toBeInTheDocument();
    await user.click(screen.getByTestId("calendar-previous-year-button"));
    expect(await screen.findByTestId("calendar-month-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("calendar-month-zoom")).not.toBeInTheDocument();
  });
});

describe("Offline state", () => {
  it("shows the offline pill when connectivity drops", async () => {
    renderApp(
      <Routes>
        <Route path="/app" element={<AppShell />} />
      </Routes>,
      "/app"
    );
    await screen.findByTestId("journal-app-shell");
    expect(screen.queryByTestId("offline-pill")).not.toBeInTheDocument();
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    window.dispatchEvent(new Event("offline"));
    expect(await screen.findByTestId("offline-pill")).toHaveTextContent("offline");
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    window.dispatchEvent(new Event("online"));
    await waitFor(() => expect(screen.queryByTestId("offline-pill")).not.toBeInTheDocument());
  });
});
describe("Entry detail", () => {
  function renderDetail() {
    return renderApp(
      <Routes>
        <Route path="/app/entry/:id" element={<EntryDetail />} />
        <Route path="/app/timeline" element={<div data-testid="timeline-stub">timeline</div>} />
      </Routes>,
      "/app/entry/entry-1"
    );
  }

  it("reads with drop cap, on-this-day memories and deletes with toast", async () => {
    const user = userEvent.setup();
    renderDetail();
    expect(await screen.findByTestId("entry-full-content")).toHaveTextContent("kitchen floor");
    expect(screen.getByTestId("on-this-day-callout")).toBeInTheDocument();
    expect(screen.getByTestId("on-this-day-entry-link").getAttribute("href")).toBe("/app/entry/entry-4");

    await user.click(screen.getByTestId("delete-entry-button"));
    await user.click(screen.getByTestId("confirm-delete-button"));
    expect(await screen.findByTestId("timeline-stub")).toBeInTheDocument();
  });

  it("handles source-missing entries gracefully", async () => {
    renderApp(
      <Routes>
        <Route path="/app/entry/:id" element={<EntryDetail />} />
      </Routes>,
      "/app/entry/gone"
    );
    expect(await screen.findByTestId("entry-detail-not-found")).toBeInTheDocument();
  });
});
