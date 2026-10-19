"use client";

import { useTranslations } from "next-intl";
import { CircleCheckBigIcon, FunnelIcon, TrophyIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { displayLocale } from "@/lib/i18n/runtime";
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

/** The pipeline-at-a-glance strip: what's in play, what landed, how often you win. */
export function LeadStatTiles({
  counts,
  className,
}: {
  counts: LeadCounts | undefined;
  className?: string;
}) {
  const t = useTranslations("leads.stats");

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
  const winRate = decided > 0 ? counts.won_90d / decided : null;

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-3", className)}>
      <StatTile
        icon={FunnelIcon}
        label={t("pipeline")}
        value={formatCents(counts.pipeline_value_cents)}
        detail={
          counts.open > 0
            ? counts.new > 0
              ? t("openLeadsWithNew", { count: counts.open, newCount: counts.new })
              : t("openLeads", { count: counts.open })
            : t("noOpenLeads")
        }
        tone="info"
      />
      <StatTile
        icon={CircleCheckBigIcon}
        label={t("wonThisMonth")}
        value={formatCents(counts.won_this_month_cents)}
        detail={t("wonAllTime", { count: counts.won })}
        tone="success"
      />
      <StatTile
        icon={TrophyIcon}
        label={t("winRate")}
        value={
          winRate !== null
            ? new Intl.NumberFormat(displayLocale(), {
                style: "percent",
                maximumFractionDigits: 0,
              }).format(winRate)
            : "—"
        }
        detail={
          winRate !== null
            ? t("winRateDetail", { won: counts.won_90d, decided })
            : t("noClosedLeads")
        }
        tone="cta"
      />
    </div>
  );
}
