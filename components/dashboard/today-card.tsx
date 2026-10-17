"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusiness } from "@/components/business/business-provider";
import { useSystemCalendar } from "@/hooks/use-calendar-view";
import { businessDayUtcRange, formatTimeOfDay } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { SystemCalendarItem } from "@/lib/api/types";

/** Matches the calendar legend — one hue per event kind. */
const KIND: Record<SystemCalendarItem["type"], { dot: string; label: string }> = {
  appointment: { dot: "bg-event-appointment", label: "Appointment" },
  callback: { dot: "bg-event-callback", label: "Callback" },
  job: { dot: "bg-event-job", label: "Job" },
};

function subLabel(item: SystemCalendarItem): string {
  const parts = [KIND[item.type].label, item.status.replace(/_/g, " ")];
  if (item.member) parts.push(item.member.name);
  return parts.join(" · ");
}

/** Today's bookings from the system calendar, as a compact agenda rail. */
export function TodayCard({ className }: { className?: string }) {
  const { business } = useBusiness();

  const range = useMemo(() => {
    const { startIso, endIso } = businessDayUtcRange(business.timezone);
    return { fromIso: startIso, toIso: endIso };
  }, [business.timezone]);

  const query = useSystemCalendar(business.id, range, "", true);

  const items = useMemo(
    () =>
      [...(query.data ?? [])].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [query.data]
  );

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>Today</CardTitle>
        <CardDescription>Appointments, jobs and callbacks</CardDescription>
        <CardAction>
          <Link
            href={`/b/${business.id}/calendar`}
            className="text-[13px] font-medium text-cta hover:underline"
          >
            Open calendar
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {query.isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Empty className="flex-1 border border-dashed py-10">
            <EmptyHeader>
              <EmptyTitle>Nothing scheduled</EmptyTitle>
              <EmptyDescription>
                Bookings your AI makes on calls land here automatically.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col">
            {items.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-b-0"
              >
                <span className="w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {formatTimeOfDay(item.starts_at, business.timezone)}
                </span>
                <span
                  aria-hidden
                  className={cn("size-2 shrink-0 rounded-full", KIND[item.type].dot)}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{item.title}</span>
                  <span className="truncate text-xs text-muted-foreground capitalize">
                    {subLabel(item)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
