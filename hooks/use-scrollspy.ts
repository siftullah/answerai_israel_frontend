"use client";

import { useEffect, useState } from "react";
import { useScrollContainerRef } from "@/components/layout/scroll-container-context";

/**
 * Tracks which section the reader is in: the last section whose top has
 * passed a reading line ~30% down the scroll viewport. At the very bottom
 * the final section wins — short tail sections could otherwise never become
 * active because they can't scroll high enough to reach the line.
 *
 * Inside AppShell the scroll container is the shell's content div (via
 * ScrollContainerContext); elsewhere it falls back to window scrolling.
 */
export function useScrollspy(ids: readonly string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);
  const containerRef = useScrollContainerRef();

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const container = containerRef?.current ?? null;

      const atBottom = container
        ? container.scrollTop + container.clientHeight >= container.scrollHeight - 4
        : window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 4;
      if (atBottom) {
        setActiveId(ids[ids.length - 1] ?? null);
        return;
      }

      // Section rects are viewport-relative, so the reading line must be too.
      const line = container
        ? container.getBoundingClientRect().top + container.clientHeight * 0.3
        : window.innerHeight * 0.3;
      let current = ids[0] ?? null;
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= line) {
          current = id;
        }
      }
      setActiveId(current);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const scrollTarget: HTMLElement | Window = containerRef?.current ?? window;

    update();
    scrollTarget.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      scrollTarget.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids, containerRef]);

  return activeId;
}
