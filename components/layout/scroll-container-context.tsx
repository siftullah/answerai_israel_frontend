"use client";

import { createContext, useContext } from "react";

/**
 * The app shell's scroll container (the element that actually scrolls page
 * content). Null outside AppShell — consumers fall back to window scrolling.
 */
export const ScrollContainerContext =
  createContext<React.RefObject<HTMLDivElement | null> | null>(null);

export function useScrollContainerRef() {
  return useContext(ScrollContainerContext);
}
