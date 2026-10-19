"use client";

import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Label, PolarAngleAxis, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DashboardCalls } from "@/lib/api/types";

/** The gauge doubles as a status read: green is healthy, amber is slipping. */
function rateColor(pct: number): string {
  if (pct >= 80) return "var(--success)";
  if (pct >= 60) return "var(--warning)";
  return "var(--destructive)";
}

/** Share of last week's calls the AI ran to completion, as a radial gauge. */
export function AnswerRateCard({
  calls,
  className,
}: {
  calls: DashboardCalls | undefined;
  className?: string;
}) {
  const t = useTranslations("dashboard.answerRate");

  if (!calls) {
    return <Skeleton className={cn("h-full min-h-[280px] rounded-2xl", className)} />;
  }

  const chartConfig = {
    answered: { label: t("seriesAnswered") },
  } satisfies ChartConfig;

  const total = calls.last_7_days;
  const pct = total > 0 ? Math.round((calls.answered_last_7 / total) * 100) : 0;

  const prevPct =
    calls.prev_7_days > 0
      ? Math.round((calls.answered_prev_7 / calls.prev_7_days) * 100)
      : null;
  const deltaPts = prevPct !== null ? pct - prevPct : null;

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("period")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center gap-2">
        {total === 0 ? (
          <Empty className="w-full flex-1 border border-dashed py-10">
            <EmptyHeader>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="aspect-square w-full max-w-[180px]">
              <RadialBarChart
                data={[{ name: "answered", value: pct }]}
                startAngle={90}
                endAngle={-270}
                innerRadius="72%"
                outerRadius="100%"
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                  dataKey="value"
                  background={{ fill: "var(--muted)" }}
                  cornerRadius={12}
                  fill={rateColor(pct)}
                />
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                      const cx = Number(viewBox.cx);
                      const cy = Number(viewBox.cy);
                      return (
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan
                            x={cx}
                            y={cy - 4}
                            className="fill-foreground font-heading text-3xl font-semibold tabular-nums"
                          >
                            {pct}%
                          </tspan>
                          <tspan x={cx} y={cy + 18} className="fill-muted-foreground text-xs">
                            {t("gaugeCaption")}
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </PolarRadiusAxis>
              </RadialBarChart>
            </ChartContainer>
            <p className="text-xs text-muted-foreground tabular-nums">
              {t("summary", { answered: calls.answered_last_7, total })}
            </p>
            {deltaPts !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                  deltaPts >= 0
                    ? "bg-success/10 text-success dark:bg-success/20"
                    : "bg-warning/10 text-warning dark:bg-warning/20"
                )}
              >
                {deltaPts >= 0 ? (
                  <TrendingUpIcon className="size-3" />
                ) : (
                  <TrendingDownIcon className="size-3" />
                )}
                {t("delta", { sign: deltaPts >= 0 ? "+" : "", points: deltaPts })}
              </span>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
