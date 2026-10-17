"use client";

import { CircleCheckBigIcon, FunnelIcon, TrophyIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { LeadCounts } from "@/lib/api/types";

function StatTile({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** Pre-formatted — money or a percentage. */
  value: string;
  detail: string;
  tone: "info" | "success" | "cta";
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border p-4">
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full",
          tone === "info" && "bg-info/10 text-info dark:bg-info/20",
          tone === "success" && "bg-success/10 text-success dark:bg-success/20",
          tone === "cta" && "bg-cta/10 text-cta dark:bg-cta/20"
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

/** The pipeline-at-a-glance strip: what's in play, what landed, how often you win. */
export function LeadStatTiles({
  counts,
  className,
}: {
  counts: LeadCounts | undefined;
  className?: string;
}) {
  if (!counts) {
    return (
      <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-3", className)}>
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[86px] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const decided = counts.won_90d + counts.lost_90d;
  const winRate = decided > 0 ? Math.round((counts.won_90d / decided) * 100) : null;

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-3", className)}>
      <StatTile
        icon={FunnelIcon}
        label="Pipeline"
        value={formatCents(counts.pipeline_value_cents)}
        detail={
          counts.open > 0
            ? `${plural(counts.open, "open lead")}${
                counts.new > 0 ? ` · ${counts.new} new` : ""
              }`
            : "No open leads"
        }
        tone="info"
      />
      <StatTile
        icon={CircleCheckBigIcon}
        label="Won this month"
        value={formatCents(counts.won_this_month_cents)}
        detail={`${plural(counts.won, "lead")} won all time`}
        tone="success"
      />
      <StatTile
        icon={TrophyIcon}
        label="Win rate"
        value={winRate !== null ? `${winRate}%` : "—"}
        detail={
          winRate !== null
            ? `${counts.won_90d} of ${plural(decided, "closed lead")}, last 90 days`
            : "No closed leads in the last 90 days"
        }
        tone="cta"
      />
    </div>
  );
}
