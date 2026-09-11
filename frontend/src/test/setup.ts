import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./server";
import { installTestAuth, setTestUser } from "./authEnv";

installTestAuth();

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  // Re-wrap AFTER listen: MSW patches fetch on listen and would otherwise
  // short-circuit the header-injecting wrapper installed above.
  installTestAuth();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  setTestUser("user-1");
  window.localStorage.clear();
  window.sessionStorage.clear();
  // Mocked Set-Cookie responses accumulate in jsdom's jar and would
  // authenticate later tests behind their back.
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  }
});
afterAll(() => server.close());
