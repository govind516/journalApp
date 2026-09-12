import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let open = false;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setCommandPalette(value: boolean): void {
  if (open === value) return;
  open = value;
  for (const listener of listeners) listener();
}

/** Shared command-palette state so any surface can open the one palette. */
export function useCommandPalette(): boolean {
  return useSyncExternalStore(subscribe, () => open, () => false);
}
