import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { Route, Routes } from "react-router-dom";
import Settings from "@/pages/Settings";
import { server } from "./server";
import { db } from "./handlers";
import { toUser } from "@/lib/normalize";
import { renderApp } from "./utils";

function renderSettings() {
  return renderApp(
    <Routes>
      <Route path="/app/settings" element={<Settings />} />
    </Routes>,
    "/app/settings"
  );
}

describe("Import", () => {
  it("imports a Day One file and shows the honest summary", async () => {
    const user = userEvent.setup();
    renderSettings();
    expect(await screen.findByTestId("import-card")).toBeInTheDocument();
    const file = new File(['{"entries":[]}'], "day-one.json", { type: "application/json" });
    await user.upload(screen.getByTestId("import-file-input"), file);
    await user.selectOptions(screen.getByTestId("import-format-select"), "dayone");
    await user.click(screen.getByTestId("import-submit-button"));
    expect(await screen.findByTestId("import-result")).toBeInTheDocument();
    expect(screen.getByTestId("import-summary")).toHaveTextContent("2 pages brought in, 1 already here.");
    expect(screen.getByTestId("import-errors")).toHaveTextContent("invalid creationDate");
    expect(db.entries.some((e) => e.id === "entry-imported-1")).toBe(true);
  });

  it("surfaces server validation errors calmly", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/import", () => HttpResponse.json({ detail: "Files up to 5 MB can be imported" }, { status: 413 }))
    );
    renderSettings();
    await screen.findByTestId("import-card");
    await user.upload(screen.getByTestId("import-file-input"), new File(["x".repeat(10)], "big.md", { type: "text/markdown" }));
    await user.click(screen.getByTestId("import-submit-button"));
    expect(await screen.findByTestId("import-error")).toHaveTextContent("5 MB");
  });

  it("requires a signed-in session", async () => {
    const { setTestUser } = await import("./authEnv");
    setTestUser(null);
    renderSettings();
    await screen.findByTestId("import-card");
    await userEvent.setup().upload(screen.getByTestId("import-file-input"), new File(["# 2026-01-01\n\nhi"], "a.md"));
    await userEvent.setup().click(screen.getByTestId("import-submit-button"));
    await waitFor(() => expect(screen.getByTestId("import-error")).toBeInTheDocument());
  });
});

describe("Settings privacy surface", () => {
  it("keeps export and import beside the PIN lock", async () => {
    renderSettings();
    await screen.findByTestId("privacy-settings-card");
    expect(screen.getByTestId("download-markdown-button")).toBeInTheDocument();
    expect(screen.getByTestId("download-json-button")).toBeInTheDocument();
    expect(screen.getByTestId("import-card")).toBeInTheDocument();
  });

  it("normalizes the session user for the privacy card", async () => {
    renderSettings();
    await screen.findByTestId("privacy-settings-card");
    expect(toUser(db.users[0] as unknown as Record<string, unknown>).name).toBe("Demo Writer");
  });
});
