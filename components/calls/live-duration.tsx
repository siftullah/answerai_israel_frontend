"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/datetime";

/** Ticking elapsed time for an in-flight outbound call; "—" until it starts. */
export function LiveDuration({
  startedAt,
  className,
}: {
  startedAt: string | null;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  if (startedAt === null) return <span className={className}>—</span>;

  const elapsed = Math.max(0, (now - Date.parse(startedAt)) / 1000);
  return <span className={className}>{formatDuration(elapsed)}</span>;
}
