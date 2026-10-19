"use client";

import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { parseDateKey } from "@/lib/datetime";
import { displayLocale } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";
import type { DashboardCalls, DashboardSeriesPoint } from "@/lib/api/types";

function tickLabel(key: string): string {
  const date = parseDateKey(key);
  return date ? date.toLocaleDateString(displayLocale(), { day: "numeric", month: "short" }) : key;
}

function tooltipLabel(key: string): string {
  const date = parseDateKey(key);
  return date
    ? date.toLocaleDateString(displayLocale(), { weekday: "short", day: "numeric", month: "short" })
    : key;
}

/** Week-over-week delta chip; hidden until there's a prior week to compare. */
function TrendChip({ calls }: { calls: DashboardCalls }) {
  const t = useTranslations("dashboard.callVolume");
  if (calls.prev_7_days === 0) return null;

  const pct = Math.round(
    ((calls.last_7_days - calls.prev_7_days) / calls.prev_7_days) * 100
  );
  const up = pct >= 0;
  const Icon = up ? TrendingUpIcon : TrendingDownIcon;

  return (
    <div className="flex flex-col items-end gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
          up
            ? "bg-success/10 text-success dark:bg-success/20"
            : "bg-warning/10 text-warning dark:bg-warning/20"
        )}
      >
        <Icon className="size-3" />
        {up ? "+" : ""}
        {pct}%
      </span>
      <span className="text-xs text-muted-foreground">{t("vsPriorWeek")}</span>
    </div>
  );
}

/** Gradient stacked areas — inbound is the base layer, outbound sits on top. */
export function CallVolumeChart({
  series,
  calls,
  className,
}: {
  series: DashboardSeriesPoint[] | undefined;
  calls: DashboardCalls | undefined;
  className?: string;
}) {
  const t = useTranslations("dashboard.callVolume");
  const total = series?.reduce((sum, point) => sum + point.inbound + point.outbound, 0);

  /**
   * Two-series palette validated against the house tokens: brand blue for
   * inbound, the mid cyan ramp step for outbound (CVD-safe, ≥3:1 on white).
   */
  const chartConfig = {
    inbound: { label: t("inbound"), color: "var(--brand-blue)" },
    outbound: { label: t("outbound"), color: "var(--chart-3)" },
  } satisfies ChartConfig;

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {total !== undefined ? t("total", { count: total }) : t("period")}
        </CardDescription>
        {calls && (
          <CardAction>
            <TrendChip calls={calls} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {!series ? (
          <Skeleton className="h-[240px] w-full rounded-xl" />
        ) : total === 0 ? (
          <Empty className="h-[240px] border border-dashed">
            <EmptyHeader>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <AreaChart data={series} margin={{ top: 8, left: -16, right: 4 }}>
              <defs>
                <linearGradient id="fillInbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-inbound)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--color-inbound)" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="fillOutbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-outbound)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--color-outbound)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={1}
                tickFormatter={tickLabel}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={32} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(value) => tooltipLabel(String(value))}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                dataKey="inbound"
                type="natural"
                fill="url(#fillInbound)"
                stroke="var(--color-inbound)"
                strokeWidth={2}
                stackId="volume"
              />
              <Area
                dataKey="outbound"
                type="natural"
                fill="url(#fillOutbound)"
                stroke="var(--color-outbound)"
                strokeWidth={2}
                stackId="volume"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
