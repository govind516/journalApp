import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Route, Routes } from "react-router-dom";
import Auth from "@/pages/Auth";
import LockScreen from "@/components/LockScreen";
import PrivacyCard from "@/components/PrivacyCard";
import ProtectedRoute from "@/components/ProtectedRoute";
import { setTestUser } from "./authEnv";
import { db } from "./handlers";
import { toUser } from "@/lib/normalize";
import { hashPin, setPinHash } from "@/lib/lock";
import { renderApp } from "./utils";

describe("Auth + privacy/account flows", () => {
  function renderAuth(mode: "login" | "signup" = "login") {
    return renderApp(
      <Routes>
        <Route path="/login" element={<Auth mode={mode} />} />
        <Route path="/signup" element={<Auth mode="signup" />} />
        <Route path="/app" element={<div data-testid="app-stub">app</div>} />
        <Route path="/" element={<div data-testid="home-stub">home</div>} />
      </Routes>,
      "/login"
    );
  }

  it("logs in and lands in the app", async () => {
    const user = userEvent.setup();
    renderAuth();
    await user.type(screen.getByTestId("login-email-input"), "demo@journal.local");
    await user.type(screen.getByTestId("login-password-input"), "password123");
    await user.click(screen.getByTestId("login-submit-button"));
    expect(await screen.findByTestId("app-stub")).toBeInTheDocument();
  });

  it("rejects bad credentials with the server message", async () => {
    const user = userEvent.setup();
    renderAuth();
    await user.type(screen.getByTestId("login-email-input"), "demo@journal.local");
    await user.type(screen.getByTestId("login-password-input"), "wrong");
    await user.click(screen.getByTestId("login-submit-button"));
    expect(await screen.findByTestId("auth-error-message")).toHaveTextContent("not recognised");
  });

  it("signs up a fresh account", async () => {
    const user = userEvent.setup();
    renderApp(
      <Routes>
        <Route path="/signup" element={<Auth mode="signup" />} />
        <Route path="/app" element={<div data-testid="app-stub">app</div>} />
      </Routes>,
      "/signup"
    );
    await user.type(screen.getByTestId("signup-name-input"), "New Writer");
    await user.type(screen.getByTestId("signup-email-input"), "new@journal.local");
    await user.type(screen.getByTestId("signup-password-input"), "password123");
    await user.click(screen.getByTestId("signup-submit-button"));
    expect(await screen.findByTestId("app-stub")).toBeInTheDocument();
  });

  it("redirects to login without an authenticated session", async () => {
    renderApp(
      <Routes>
        <Route path="/app" element={<ProtectedRoute />} >
          <Route index element={<div data-testid="app-stub">app</div>} />
        </Route>
        <Route path="/login" element={<div data-testid="login-stub">login</div>} />
      </Routes>,
      "/app",
      null
    );
    expect(await screen.findByTestId("login-stub")).toBeInTheDocument();
  });

  it("locks with a PIN and unlocks with the right one", async () => {
    const user = userEvent.setup();
    setPinHash("user-1", await hashPin("1234", "user-1"));
    window.sessionStorage.clear();
    renderApp(<LockScreen user={toUser(db.users[0] as unknown as Record<string, unknown>)} onUnlock={() => {}} onSignOut={() => {}} />, "/app");
    expect(await screen.findByTestId("lock-screen")).toBeInTheDocument();
    await user.type(screen.getByTestId("lock-pin-input"), "0000");
    await user.click(screen.getByTestId("lock-unlock-button"));
    expect(await screen.findByTestId("lock-error")).toHaveTextContent("didn’t match");
    await user.clear(screen.getByTestId("lock-pin-input"));
    await user.type(screen.getByTestId("lock-pin-input"), "1234");
    await user.click(screen.getByTestId("lock-unlock-button"));
    await waitFor(() => expect(window.sessionStorage.getItem("journal-unlocked-user-1")).toBe("1"));
  });

  it("deletes the whole account only after typing DELETE", async () => {
    const user = userEvent.setup();
    renderApp(<PrivacyCard user={toUser(db.users[0] as unknown as Record<string, unknown>)} />, "/app/settings");
    await user.click(screen.getByTestId("delete-account-button"));
    expect(await screen.findByTestId("delete-account-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-delete-account-button")).toBeDisabled();
    await user.type(screen.getByTestId("delete-confirm-input"), "DELETE");
    expect(screen.getByTestId("confirm-delete-account-button")).toBeEnabled();
    await user.click(screen.getByTestId("confirm-delete-account-button"));
    await waitFor(() => expect(db.users).toHaveLength(0));
    expect(db.entries).toHaveLength(0);
  });
});
