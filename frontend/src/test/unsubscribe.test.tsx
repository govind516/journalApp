import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Route, Routes } from "react-router-dom";
import Unsubscribe from "@/pages/Unsubscribe";
import { renderApp } from "./utils";

function renderUnsubscribe(token: string | null) {
  return renderApp(
    <Routes>
      <Route path="/unsubscribe" element={<Unsubscribe />} />
    </Routes>,
    token === null ? "/unsubscribe" : `/unsubscribe?token=${token}`
  );
}

describe("Unsubscribe landing", () => {
  it("confirms a valid token with no login", async () => {
    renderUnsubscribe("good-token");
    expect(await screen.findByTestId("unsubscribe-heading")).toHaveTextContent("No more nudges.");
    expect(screen.getByTestId("unsubscribe-copy")).toHaveTextContent("changed nothing else");
  });

  it("explains expired or forged links", async () => {
    renderUnsubscribe("bad-token");
    expect(await screen.findByTestId("unsubscribe-invalid-heading")).toHaveTextContent("expired");
  });

  it("handles a missing token", async () => {
    renderUnsubscribe(null);
    expect(await screen.findByTestId("unsubscribe-invalid-heading")).toBeInTheDocument();
  });
});
