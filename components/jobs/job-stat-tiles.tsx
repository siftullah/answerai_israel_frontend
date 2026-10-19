"use client";

import {
  BanknoteIcon,
  CalendarClockIcon,
  CircleCheckBigIcon,
  ClockAlertIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
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

/** The work-at-a-glance strip: what needs booking, today's run, what it's worth, what landed. */
export function JobStatTiles({
  counts,
  className,
}: {
  counts: JobCounts | undefined;
  className?: string;
}) {
  const t = useTranslations("jobs.stats");

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
        label={t("toSchedule.label")}
        value={String(counts.open)}
        detail={
          counts.open === 0
            ? t("toSchedule.allBooked")
            : counts.high_priority_active > 0
              ? t("toSchedule.highPriority", { count: counts.high_priority_active })
              : t("toSchedule.waiting")
        }
        tone="warning"
      />
      <StatTile
        icon={CalendarClockIcon}
        label={t("visitsToday.label")}
        value={String(counts.scheduled_today)}
        detail={
          counts.in_progress > 0
            ? t("visitsToday.inProgress", { count: counts.in_progress })
            : t("visitsToday.bookedAhead", { count: counts.scheduled })
        }
        tone="info"
      />
      <StatTile
        icon={BanknoteIcon}
        label={t("activeWork.label")}
        value={formatCents(counts.active_value_cents)}
        detail={
          counts.active > 0
            ? t("activeWork.across", { count: counts.active })
            : t("activeWork.none")
        }
        tone="cta"
      />
      <StatTile
        icon={CircleCheckBigIcon}
        label={t("completedThisMonth.label")}
        value={formatCents(counts.completed_this_month_cents)}
        detail={t("completedThisMonth.allTime", { count: counts.completed })}
        tone="success"
      />
    </div>
  );
}
