"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { displayLocale } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";
import type { DashboardHourlyPoint } from "@/lib/api/types";

/**
 * 0 → "12am", 13 → "1pm" (12-hour in every language, like lib/datetime).
 * Compact — these are axis ticks.
 */
function hourLabel(hour: number): string {
  return new Date(Date.UTC(2000, 0, 1, hour))
    .toLocaleTimeString(displayLocale(), { timeZone: "UTC", hour: "numeric", hour12: true })
    .replace(/\s/g, "");
}

function hourRange(hour: number): string {
  return `${hourLabel(hour)} – ${hourLabel((hour + 1) % 24)}`;
}

/** When callers ring, by hour of the business day — last 14 days. */
export function BusiestHoursCard({
  hourly,
  className,
}: {
  hourly: DashboardHourlyPoint[] | undefined;
  className?: string;
}) {
  const t = useTranslations("dashboard.busiestHours");

  if (!hourly) {
    return <Skeleton className={cn("h-full min-h-[280px] rounded-2xl", className)} />;
  }

  const chartConfig = {
    calls: { label: t("seriesCalls"), color: "var(--chart-3)" },
  } satisfies ChartConfig;

  const total = hourly.reduce((sum, point) => sum + point.calls, 0);
  const peak = hourly.reduce(
    (best, point) => (point.calls > best.calls ? point : best),
    hourly[0]
  );

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {total > 0 ? t("peak", { range: hourRange(peak.hour) }) : t("period")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end">
        {total === 0 ? (
          <Empty className="flex-1 border border-dashed py-10">
            <EmptyHeader>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer config={chartConfig} className="h-[190px] w-full">
            <BarChart data={hourly} margin={{ top: 8, left: -22, right: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
                tickFormatter={(value) => hourLabel(Number(value))}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) =>
                      hourRange(Number(payload?.[0]?.payload?.hour ?? 0))
                    }
                  />
                }
              />
              <Bar
                dataKey="calls"
                fill="var(--color-calls)"
                radius={[4, 4, 0, 0]}
                maxBarSize={12}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
