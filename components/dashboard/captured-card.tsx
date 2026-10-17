"use client";

import { SparklesIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DashboardCaptured } from "@/lib/api/types";

const ITEMS: { key: keyof DashboardCaptured; label: string }[] = [
  { key: "leads", label: "Leads" },
  { key: "appointments", label: "Appointments" },
  { key: "quotes", label: "Quote requests" },
  { key: "jobs", label: "Jobs" },
  { key: "callbacks", label: "Callbacks" },
];

/**
 * The value card: records the agent created from calls this month. Module
 * keys are absent when disabled, so it shows only what's switched on — and
 * disappears entirely for a business running no modules.
 */
export function CapturedCard({
  captured,
  className,
}: {
  captured: DashboardCaptured | undefined;
  className?: string;
}) {
  if (!captured) {
    return <Skeleton className={cn("h-full min-h-[280px] rounded-2xl", className)} />;
  }

  const present = ITEMS.filter((item) => captured[item.key] !== undefined);
  if (present.length === 0) return null;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col gap-5 overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] via-cta/[0.06] to-transparent p-5 dark:border-primary/25 dark:from-primary/[0.14] dark:via-cta/[0.1]",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <SparklesIcon className="size-5" />
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Captured by your AI</span>
          <span className="text-xs text-muted-foreground">This month, from calls</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        {present.map((item) => (
          <div key={item.key} className="flex flex-col">
            <span className="font-heading text-2xl font-semibold text-primary tabular-nums">
              {captured[item.key]}
            </span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-auto text-xs text-muted-foreground">
        Created automatically — no manual entry.
      </p>
    </div>
  );
}
