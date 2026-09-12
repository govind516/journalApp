import { useSyncExternalStore } from "react";

const KEY = "journal-focus";

const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setFocusMode(value: boolean): void {
  try {
    window.localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    /* private mode */
  }
  for (const listener of listeners) listener();
}

/** Shared focus-mode state so the app shell can recede in step with Today. */
export function useFocusMode(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
