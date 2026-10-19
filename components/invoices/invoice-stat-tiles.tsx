"use client";

import { useTranslations } from "next-intl";
import { AlarmClockIcon, BanknoteIcon, CircleCheckBigIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { InvoiceCounts } from "@/lib/api/types";

function StatTile({
  icon: Icon,
  label,
  amountCents,
  detail,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  amountCents: number;
  detail: string;
  tone: "info" | "destructive" | "success";
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border p-4">
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full",
          tone === "info" && "bg-info/10 text-info dark:bg-info/20",
          tone === "destructive" && "bg-destructive/10 text-destructive dark:bg-destructive/20",
          tone === "success" && "bg-success/10 text-success dark:bg-success/20"
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="truncate text-xl font-semibold tabular-nums">
          {formatCents(amountCents)}
        </span>
        <span className="truncate text-xs text-muted-foreground">{detail}</span>
      </div>
    </div>
  );
}

/** The money-at-a-glance strip: what's out there, what's late, what landed. */
export function InvoiceStatTiles({
  counts,
  className,
}: {
  counts: InvoiceCounts | undefined;
  className?: string;
}) {
  const t = useTranslations("invoices.stats");

  if (!counts) {
    return (
      <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-3", className)}>
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[86px] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-3", className)}>
      <StatTile
        icon={BanknoteIcon}
        label={t("outstanding")}
        amountCents={counts.outstanding_cents}
        detail={t("awaitingPayment", { count: counts.awaiting_payment })}
        tone="info"
      />
      <StatTile
        icon={AlarmClockIcon}
        label={t("overdue")}
        amountCents={counts.overdue_cents}
        detail={t("pastDue", { count: counts.overdue })}
        tone="destructive"
      />
      <StatTile
        icon={CircleCheckBigIcon}
        label={t("paidThisMonth")}
        amountCents={counts.paid_this_month_cents}
        detail={t("paidAllTime", { count: counts.paid })}
        tone="success"
      />
    </div>
  );
}
