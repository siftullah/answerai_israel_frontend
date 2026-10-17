"use client";

import { useCallback, useState } from "react";

export type ContactSelection =
  | { mode: "explicit"; ids: ReadonlySet<string> }
  | { mode: "all-matching" };

const EMPTY: ContactSelection = { mode: "explicit", ids: new Set() };

/**
 * Selection over a cursor-paginated list. Explicit ids accumulate across
 * loaded pages; "all-matching" targets everything the current filters match
 * (resolved server-side by the bulk endpoint — no total is known client-side).
 * Any filter change clears the selection outright.
 */
export function useContactSelection(filtersKey: string) {
  const [selection, setSelection] = useState<ContactSelection>(EMPTY);

  // Reset when the filters change — state adjusted during render (the React
  // "derive from previous props" idiom), not in an effect.
  const [lastFiltersKey, setLastFiltersKey] = useState(filtersKey);
  if (filtersKey !== lastFiltersKey) {
    setLastFiltersKey(filtersKey);
    setSelection(EMPTY);
  }

  const isSelected = useCallback(
    (id: string) => selection.mode === "all-matching" || selection.ids.has(id),
    [selection]
  );

  const toggle = useCallback((id: string, loadedIds: string[]) => {
    setSelection((current) => {
      if (current.mode === "all-matching") {
        // Gmail semantics: unchecking one row exits to an explicit selection
        // of the loaded rows minus this one.
        return { mode: "explicit", ids: new Set(loadedIds.filter((x) => x !== id)) };
      }
      const ids = new Set(current.ids);
      if (ids.has(id)) {
        ids.delete(id);
      } else {
        ids.add(id);
      }
      return { mode: "explicit", ids };
    });
  }, []);

  const togglePage = useCallback((loadedIds: string[]) => {
    setSelection((current) => {
      if (current.mode === "all-matching") return EMPTY;
      const allSelected =
        loadedIds.length > 0 && loadedIds.every((id) => current.ids.has(id));
      if (allSelected) {
        const ids = new Set(current.ids);
        loadedIds.forEach((id) => ids.delete(id));
        return { mode: "explicit", ids };
      }
      return { mode: "explicit", ids: new Set([...current.ids, ...loadedIds]) };
    });
  }, []);

  const enterAllMatching = useCallback(() => setSelection({ mode: "all-matching" }), []);
  const clear = useCallback(() => setSelection(EMPTY), []);

  /** Explicit count; null while all-matching (cursor meta has no total). */
  const count = selection.mode === "explicit" ? selection.ids.size : null;
  const active = selection.mode === "all-matching" || selection.ids.size > 0;

  return { selection, isSelected, toggle, togglePage, enterAllMatching, clear, count, active };
}
