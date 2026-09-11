import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Route, Routes } from "react-router-dom";
import Ask from "@/pages/Ask";
import Insights from "@/pages/Insights";
import { renderApp } from "./utils";

function renderAsk() {
  return renderApp(
    <Routes>
      <Route path="/app/ask" element={<Ask />} />
      <Route path="/app/entry/:id" element={<div data-testid="entry-stub">entry</div>} />
    </Routes>,
    "/app/ask"
  );
}

describe("Ask My Journal", () => {
  it("answers with grounded source links and an on-device note", async () => {
    const user = userEvent.setup();
    renderAsk();
    await user.type(screen.getByTestId("ask-input"), "What made me happiest?");
    await user.click(screen.getByTestId("ask-submit-button"));
    expect(await screen.findByTestId("ask-answer-card")).toBeInTheDocument();
    expect(screen.getByTestId("ask-answer")).toHaveTextContent("brightest");
    const link = screen.getByTestId("ask-entry-entry-1");
    expect(link.getAttribute("href")).toBe("/app/entry/entry-1");
    expect(screen.getByTestId("ask-source-note")).toHaveTextContent("nothing was sent anywhere");
  });

  it("handles no matches honestly", async () => {
    const user = userEvent.setup();
    renderAsk();
    await user.type(screen.getByTestId("ask-input"), "zzz-nothing here");
    await user.click(screen.getByTestId("ask-submit-button"));
    expect(await screen.findByTestId("ask-answer-card")).toBeInTheDocument();
    expect(screen.getByTestId("ask-answer")).toHaveTextContent("found nothing");
  });

  it("shows the empty state before asking", async () => {
    renderAsk();
    expect(await screen.findByTestId("ask-empty-state")).toBeInTheDocument();
  });
});

describe("Insights", () => {
  function renderInsights() {
    return renderApp(
      <Routes>
        <Route path="/app/insights" element={<Insights />} />
        <Route path="/app/entry/:id" element={<div data-testid="entry-stub">entry</div>} />
      </Routes>,
      "/app/insights"
    );
  }

  it("renders stats, mood chart, badges and the monthly reflection", async () => {
    renderInsights();
    await waitFor(() => expect(screen.getByTestId("stat-value-current-rhythm")).toHaveTextContent("2 days"));
    expect(screen.getByTestId("mood-chart-svg")).toBeInTheDocument();
    expect(screen.getByTestId("badges-progress-label")).toHaveTextContent("1 of 2 found");
    expect(await screen.findByTestId("reflection-card")).toBeInTheDocument();
    expect(screen.getByTestId("reflection-narrative")).toHaveTextContent("grateful");
    expect(screen.getByTestId("reflection-longest-link").getAttribute("href")).toBe("/app/entry/entry-1");
  });

  it("navigates reflection months", async () => {
    const user = userEvent.setup();
    renderInsights();
    await screen.findByTestId("reflection-card");
    const label = screen.getByTestId("reflection-month-label");
    const before = label.textContent;
    await user.click(screen.getByTestId("reflection-prev-month"));
    await waitFor(() => expect(screen.getByTestId("reflection-month-label").textContent).not.toBe(before));
  });
});
