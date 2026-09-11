import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "@/lib/theme";
import { db, resetDb, type MockEntry } from "./handlers";
import { setTestUser } from "./authEnv";

export function renderApp(ui: ReactElement, route = "/app", userId: string | null = "user-1", mutateDb?: (db: { entries: MockEntry[] }) => void) {
  resetDb();
  setTestUser(userId);
  if (mutateDb) mutateDb(db);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <ThemeProvider>
      <MotionConfig reducedMotion="always">
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </QueryClientProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
