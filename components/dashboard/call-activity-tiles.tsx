"use client";

import { BotIcon, PhoneIcon, PhoneMissedIcon, TimerIcon, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { DashboardCalls } from "@/lib/api/types";

type Tone = "info" | "success" | "warning" | "cta";

/** Tint pairs mirror the badge palette; the glow is the tile's soft backdrop. */
const TONE: Record<Tone, { chip: string; glow: string }> = {
  info: { chip: "bg-info/10 text-info dark:bg-info/20", glow: "bg-info/10" },
  success: { chip: "bg-success/10 text-success dark:bg-success/20", glow: "bg-success/10" },
  warning: { chip: "bg-warning/10 text-warning dark:bg-warning/20", glow: "bg-warning/10" },
  cta: { chip: "bg-cta/10 text-cta dark:bg-cta/20", glow: "bg-cta/10" },
};

function HeroTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  const t = TONE[tone];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-10 -right-8 size-28 rounded-full blur-2xl",
          t.glow
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
          <span className="font-heading text-3xl font-semibold tracking-tight tabular-nums">
            {value}
          </span>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            t.chip
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-2.5 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

/** The hero strip: what the AI handled today, and the month's talk time. */
export function CallActivityTiles({ calls }: { calls: DashboardCalls | undefined }) {
  if (!calls) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[118px] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const { today } = calls;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <HeroTile
        label="Calls today"
        value={String(today.total)}
        detail={
          today.total > 0
            ? `${today.inbound} inbound · ${today.outbound} outbound`
            : "No calls yet today"
        }
        icon={PhoneIcon}
        tone="info"
      />
      <HeroTile
        label="Answered by AI"
        value={String(today.answered)}
        detail={
          today.transferred > 0
            ? `${today.transferred} passed to your team`
            : "Handled end to end"
        }
        icon={BotIcon}
        tone="success"
      />
      <HeroTile
        label="Missed"
        value={String(today.missed)}
        detail={today.missed > 0 ? "Busy, failed or rang out" : "Nothing slipped through"}
        icon={PhoneMissedIcon}
        tone="warning"
      />
      <HeroTile
        label="Minutes this month"
        value={calls.minutes_this_month.toLocaleString("en-AU")}
        detail={
          calls.avg_duration_seconds > 0
            ? `Avg ${formatDuration(calls.avg_duration_seconds)} per call`
            : "No talk time yet"
        }
        icon={TimerIcon}
        tone="cta"
      />
    </div>
  );
}
