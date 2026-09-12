import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "@/lib/theme";
import App from "@/App";
import { queryClient } from "@/lib/queryClient";
import { resetDb } from "./handlers";
import { setTestUser } from "./authEnv";

/**
 * Regression: the shared queryClient must never crash first-load queries.
 * placeholderData receives an undefined query on first fetch — if the
 * selector dereferences it, every screen after login renders blank.
 */
describe("App boot with the real query client", () => {
  it("renders Today with server data after login", async () => {
    resetDb();
    setTestUser("user-1");
    window.localStorage.clear();
    window.sessionStorage.clear();
    queryClient.clear();
    render(
      <ThemeProvider>
        <MotionConfig reducedMotion="always">
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/app"]}>
              <App />
            </MemoryRouter>
          </QueryClientProvider>
        </MotionConfig>
      </ThemeProvider>
    );
    expect(await screen.findByTestId("today-page", {}, { timeout: 8000 })).toBeInTheDocument();
    const editor = (await screen.findByTestId("today-editor-textarea")) as HTMLTextAreaElement;
    // Route-split loading adds an async hop before server data arrives.
    await waitFor(() => expect(editor.value).toContain("kitchen floor"));
    // Sidebar chapters + accent-dot active state (dot itself is CSS, assert the class).
    expect(screen.getByTestId("sidebar-chapter-write")).toHaveTextContent("Write");
    expect(screen.getByTestId("sidebar-chapter-remember")).toHaveTextContent("Remember");
    expect(screen.getByTestId("sidebar-chapter-understand")).toHaveTextContent("Understand");
    expect(screen.getByTestId("nav-today-link")).toHaveClass("nav-item-active");
    expect(screen.getByTestId("nav-timeline-link")).not.toHaveClass("nav-item-active");
  });

  it("focus mode recedes the sidebar until toggled off", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("journal-focus", "1");
    try {
      render(
        <ThemeProvider>
          <MotionConfig reducedMotion="always">
            <QueryClientProvider client={queryClient}>
              <MemoryRouter initialEntries={["/app"]}>
                <App />
              </MemoryRouter>
            </QueryClientProvider>
          </MotionConfig>
        </ThemeProvider>
      );
      expect(await screen.findByTestId("today-page", {}, { timeout: 8000 })).toBeInTheDocument();
      expect(screen.queryByTestId("desktop-sidebar")).not.toBeInTheDocument();
      expect(screen.queryByTestId("mobile-header")).not.toBeInTheDocument();
      await user.click(screen.getByTestId("focus-mode-toggle"));
      expect(await screen.findByTestId("desktop-sidebar")).toBeInTheDocument();
    } finally {
      window.localStorage.removeItem("journal-focus");
    }
  });
});
