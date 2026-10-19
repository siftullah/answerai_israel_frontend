"use client";

import { SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DashboardCaptured } from "@/lib/api/types";

/** Display order. */
const ITEMS: (keyof DashboardCaptured)[] = ["leads", "appointments", "quotes", "jobs", "callbacks"];

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
  const t = useTranslations("dashboard.captured");

  if (!captured) {
    return <Skeleton className={cn("h-full min-h-[280px] rounded-2xl", className)} />;
  }

  const present = ITEMS.filter((key) => captured[key] !== undefined);
  const labels: Record<keyof DashboardCaptured, string> = {
    leads: t("items.leads"),
    appointments: t("items.appointments"),
    quotes: t("items.quotes"),
    jobs: t("items.jobs"),
    callbacks: t("items.callbacks"),
  };
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
          <span className="text-sm font-semibold">{t("title")}</span>
          <span className="text-xs text-muted-foreground">{t("period")}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        {present.map((key) => (
          <div key={key} className="flex flex-col">
            <span className="font-heading text-2xl font-semibold text-primary tabular-nums">
              {captured[key]}
            </span>
            <span className="text-xs text-muted-foreground">{labels[key]}</span>
          </div>
        ))}
      </div>
      <p className="mt-auto text-xs text-muted-foreground">{t("footer")}</p>
    </div>
  );
}
