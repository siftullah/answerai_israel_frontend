import type { CampaignStats } from "@/lib/api/types";

/** "Done" = recipients the pacer will never dial again. */
export function campaignProgress(stats: CampaignStats) {
  const done =
    stats.completed +
    stats.failed +
    stats.max_attempts +
    stats.dnc_blocked +
    stats.invalid +
    stats.skipped +
    stats.canceled;
  return {
    done,
    total: stats.total,
    pct: stats.total > 0 ? (done / stats.total) * 100 : 0,
  };
}

export function CampaignProgress({ stats }: { stats: CampaignStats }) {
  const { done, total, pct } = campaignProgress(stats);
  if (total === 0) {
    return <span className="text-sm text-muted-foreground">No recipients</span>;
  }
  return (
    <div className="flex min-w-32 flex-col gap-1">
      <span className="text-sm tabular-nums">
        {done} of {total}
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
