"use client";

import {
  BanknoteIcon,
  CalendarClockIcon,
  CircleCheckBigIcon,
  ClockAlertIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { JobCounts } from "@/lib/api/types";

function StatTile({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** Pre-formatted — a count or money. */
  value: string;
  detail: string;
  tone: "info" | "success" | "cta" | "warning";
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border p-4">
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full",
          tone === "info" && "bg-info/10 text-info dark:bg-info/20",
          tone === "success" && "bg-success/10 text-success dark:bg-success/20",
          tone === "cta" && "bg-cta/10 text-cta dark:bg-cta/20",
          tone === "warning" && "bg-warning/10 text-warning dark:bg-warning/20"
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="truncate text-xl font-semibold tabular-nums">{value}</span>
        <span className="truncate text-xs text-muted-foreground">{detail}</span>
      </div>
    </div>
  );
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** The work-at-a-glance strip: what needs booking, today's run, what it's worth, what landed. */
export function JobStatTiles({
  counts,
  className,
}: {
  counts: JobCounts | undefined;
  className?: string;
}) {
  if (!counts) {
    return (
      <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[86px] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      <StatTile
        icon={ClockAlertIcon}
        label="To schedule"
        value={String(counts.open)}
        detail={
          counts.open === 0
            ? "Every job has a time"
            : counts.high_priority_active > 0
              ? `${plural(counts.high_priority_active, "high-priority job")} in play`
              : "Waiting to be booked in"
        }
        tone="warning"
      />
      <StatTile
        icon={CalendarClockIcon}
        label="Visits today"
        value={String(counts.scheduled_today)}
        detail={
          counts.in_progress > 0
            ? `${plural(counts.in_progress, "job")} in progress`
            : `${plural(counts.scheduled, "visit")} booked ahead`
        }
        tone="info"
      />
      <StatTile
        icon={BanknoteIcon}
        label="Active work"
        value={formatCents(counts.active_value_cents)}
        detail={counts.active > 0 ? `Across ${plural(counts.active, "active job")}` : "No active jobs"}
        tone="cta"
      />
      <StatTile
        icon={CircleCheckBigIcon}
        label="Completed this month"
        value={formatCents(counts.completed_this_month_cents)}
        detail={`${plural(counts.completed, "job")} completed all time`}
        tone="success"
      />
    </div>
  );
}
