"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ViewMode = "table" | "cards";

const KEY_PREFIX = "answerai.view-mode.";

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  // Cross-tab changes arrive via the storage event.
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function read(key: string): ViewMode {
  try {
    return window.localStorage.getItem(key) === "cards" ? "cards" : "table";
  } catch {
    return "table";
  }
}

/**
 * Per-section table⇄cards preference, persisted to localStorage. The
 * server snapshot pins "table" so SSR HTML never mismatches; the client
 * value applies right after hydration.
 */
export function useViewMode(sectionKey: string): [ViewMode, (mode: ViewMode) => void] {
  const key = KEY_PREFIX + sectionKey;
  const mode = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => "table" as ViewMode
  );
  const setMode = useCallback(
    (next: ViewMode) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Storage blocked (private mode) — the preference just won't stick.
      }
      for (const listener of listeners) listener();
    },
    [key]
  );
  return [mode, setMode];
}
