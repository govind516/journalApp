import { QueryClient, type Query, type QueryKey } from "@tanstack/react-query";
import { isCacheable, loadSnapshot, saveSnapshot } from "./offlineCache";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Offline, cached reads win over failed fetches; online behavior unchanged.
      // NOTE: previousQuery is undefined on first fetch — guard it.
      networkMode: "offlineFirst",
      placeholderData: (previousData: unknown, query: Query<unknown, Error, unknown, QueryKey> | undefined) =>
        (previousData as unknown) ?? (query ? loadSnapshot(query.queryKey) : undefined),
    },
  },
});

// Mirror successful journal reads to the durable cache (debounced).
let persistTimer: number | undefined;
queryClient.getQueryCache().subscribe((event) => {
  if (event.type !== "updated" || event.action.type !== "success" || !isCacheable(event.query.queryKey)) return;
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    saveSnapshot(event.query.queryKey, event.query.state.data);
  }, 500);
});
