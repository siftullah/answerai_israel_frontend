"use client";

import {
  BanIcon,
  CheckCircle2Icon,
  HourglassIcon,
  PhoneCallIcon,
  TimerIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignStats } from "@/lib/api/types";

/** Each metric owns one hue — the icon chip's tint and the value share it,
 * mirroring the badge palette (bg-{tone}/10 text-{tone}). */
type Tone = "info" | "primary" | "success" | "destructive" | "warning" | "cta";

const TONE: Record<Tone, { chip: string; value: string }> = {
  info: { chip: "bg-info/10 text-info dark:bg-info/20", value: "text-info" },
  primary: {
    chip: "bg-primary/10 text-primary dark:bg-primary/20",
    value: "text-primary",
  },
  success: {
    chip: "bg-success/10 text-success dark:bg-success/20",
    value: "text-success",
  },
  destructive: {
    chip: "bg-destructive/10 text-destructive dark:bg-destructive/20",
    value: "text-destructive",
  },
  warning: {
    chip: "bg-warning/10 text-warning dark:bg-warning/20",
    value: "text-warning",
  },
  cta: { chip: "bg-cta/10 text-cta dark:bg-cta/20", value: "text-cta" },
};

function StatTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  const t = TONE[tone];
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          t.chip
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className={cn("text-2xl font-bold tabular-nums", t.value)}>{value}</span>
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      </div>
    </div>
  );
}

/** The funnel at a glance — fed by the pacer's denormalized stats blob. */
export function CampaignStatsStrip({ stats }: { stats: CampaignStats }) {
  const waiting = stats.pending + stats.queued + stats.retry_scheduled;
  const failed = stats.failed + stats.max_attempts;
  const blocked = stats.dnc_blocked + stats.invalid + stats.skipped;

  const waitingDetail = [
    stats.queued > 0 ? `${stats.queued} queued` : null,
    stats.retry_scheduled > 0 ? `${stats.retry_scheduled} awaiting retry` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const blockedDetail = [
    stats.dnc_blocked > 0 ? `${stats.dnc_blocked} on DNC` : null,
    stats.invalid > 0 ? `${stats.invalid} invalid` : null,
    stats.skipped > 0 ? `${stats.skipped} skipped` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <StatTile
        label="Waiting"
        value={String(waiting)}
        detail={waitingDetail || undefined}
        icon={HourglassIcon}
        tone="info"
      />
      <StatTile label="Calling" value={String(stats.calling)} icon={PhoneCallIcon} tone="primary" />
      <StatTile
        label="Completed"
        value={String(stats.completed)}
        icon={CheckCircle2Icon}
        tone="success"
      />
      <StatTile
        label="Failed"
        value={String(failed)}
        detail={stats.max_attempts > 0 ? `${stats.max_attempts} hit max attempts` : undefined}
        icon={XCircleIcon}
        tone="destructive"
      />
      <StatTile
        label="Blocked"
        value={String(blocked)}
        detail={blockedDetail || undefined}
        icon={BanIcon}
        tone="warning"
      />
      <StatTile
        label="Minutes used"
        value={stats.minutes_used.toFixed(1)}
        icon={TimerIcon}
        tone="cta"
      />
    </div>
  );
}
