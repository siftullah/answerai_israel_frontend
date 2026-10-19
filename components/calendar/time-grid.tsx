"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { zonedMinutesOfDay } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { BusinessHourRow, Weekday } from "@/lib/api/types";
import { WEEKDAYS } from "@/lib/api/types";
import {
  dayOfMonth,
  eventsForDay,
  hourLabel,
  layoutOverlaps,
  weekdayShort,
  type GridEvent,
} from "@/components/calendar/calendar-lib";
import { EventBlock, EventChip } from "@/components/calendar/event-block";

const HOUR_PX = 96;
const GUTTER = "3.5rem";

/** Weekday of a calendar key, monday-first to match WEEKDAYS. */
function weekdayOfKey(key: string): Weekday {
  const [year, month, day] = key.split("-").map(Number);
  const js = new Date(year, month - 1, day).getDay();
  return WEEKDAYS[(js + 6) % 7];
}

/** Closed intervals (minutes) for one weekday, from the trading-hours week. */
function closedIntervals(
  hours: BusinessHourRow[],
  weekday: Weekday
): { start: number; end: number }[] {
  const toMin = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  const row = hours.find((r) => r.day === weekday);
  const windows =
    row?.is_available && row.windows
      ? row.windows
          .map((w) => ({ start: toMin(w.start), end: toMin(w.end) }))
          .sort((a, b) => a.start - b.start)
      : [];

  const closed: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const window of windows) {
    if (window.start > cursor) closed.push({ start: cursor, end: window.start });
    cursor = Math.max(cursor, window.end);
  }
  if (cursor < 24 * 60) closed.push({ start: cursor, end: 24 * 60 });
  return closed;
}

/** Re-evaluates "now" once a minute for the current-time rule. */
function useNowTick(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/**
 * Hand-built week/day time grid: hour ruler, one column per business-zone day,
 * non-trading hours shaded, events absolutely positioned with overlap columns.
 * No dragging — blocks open the detail dialog, empty space books.
 */
export function TimeGrid({
  dayKeys,
  timeZone,
  todayKey,
  events,
  allDayEvents = [],
  businessHours = [],
  onSelectEvent,
  onSelectSlot,
}: {
  dayKeys: string[];
  timeZone: string;
  todayKey: string;
  events: GridEvent[];
  /** Rendered as chips in a strip under the day headers (external all-day items). */
  allDayEvents?: GridEvent[];
  /** Empty = no shading (hours never configured). */
  businessHours?: BusinessHourRow[];
  onSelectEvent: (event: GridEvent) => void;
  /** Click on empty grid space — rounded down to the half hour. */
  onSelectSlot?: (dateKey: string, time: string) => void;
}) {
  const t = useTranslations("calendar.grid");
  const now = useNowTick();
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = useMemo(
    () =>
      dayKeys.map((key) => ({
        key,
        weekday: weekdayOfKey(key),
        positioned: layoutOverlaps(eventsForDay(events, key, timeZone)),
        // All-day pushes are normalized to whole UTC days upstream, so plain
        // UTC date keys are the right comparison on both ends.
        allDay: allDayEvents.filter(
          (event) => event.starts_at.slice(0, 10) <= key && key < event.ends_at.slice(0, 10)
        ),
      })),
    [dayKeys, events, allDayEvents, timeZone]
  );

  const hasAllDayRow = days.some((day) => day.allDay.length > 0);
  const nowMin = zonedMinutesOfDay(now.toISOString(), timeZone);
  const gridTemplateColumns = `${GUTTER} repeat(${dayKeys.length}, minmax(0, 1fr))`;

  // Open on the earlier of 7 am and the first event so nothing hides above the fold.
  useEffect(() => {
    const firstEventMin = Math.min(
      7 * 60,
      ...days.flatMap((day) => day.positioned.map((p) => p.startMin))
    );
    scrollRef.current?.scrollTo({ top: Math.max(0, (firstEventMin / 60) * HOUR_PX - 8) });
    // Only on mount / when the visible range changes — not on data refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKeys.join()]);

  const handleColumnClick = (key: string) => (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSelectSlot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = Math.max(
      0,
      Math.min(23.5 * 60, Math.floor((e.clientY - rect.top) / HOUR_PX / 0.5) * 30)
    );
    const pad = (n: number) => String(n).padStart(2, "0");
    onSelectSlot(key, `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
      <div ref={scrollRef} className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-20 border-b bg-background">
          <div className="grid" style={{ gridTemplateColumns }}>
            <div />
            {days.map((day) => {
              const isToday = day.key === todayKey;
              return (
                <div
                  key={day.key}
                  className="flex items-center justify-center gap-1.5 border-s py-2 text-sm"
                >
                  <span className={cn("text-muted-foreground", isToday && "text-primary")}>
                    {weekdayShort(day.key)}
                  </span>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full font-medium tabular-nums",
                      isToday && "bg-primary text-primary-foreground"
                    )}
                  >
                    {dayOfMonth(day.key)}
                  </span>
                </div>
              );
            })}
          </div>
          {hasAllDayRow && (
            <div className="grid border-t" style={{ gridTemplateColumns }}>
              <div className="py-1 pe-2 text-end text-[11px] text-muted-foreground">
                {t("allDay")}
              </div>
              {days.map((day) => (
                <div key={day.key} className="flex flex-col gap-0.5 border-s p-1">
                  {day.allDay.map((event) => (
                    <EventChip
                      key={event.key}
                      event={event}
                      timeZone={timeZone}
                      showTime={false}
                      onSelect={onSelectEvent}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid" style={{ gridTemplateColumns }}>
          <div aria-hidden>
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                className="relative text-end text-[11px] text-muted-foreground"
                style={{ height: HOUR_PX }}
              >
                {/* Labels sit above their line; midnight has no room above, so it sits below. */}
                <span
                  className={cn(
                    "absolute end-2 bg-background/80 px-0.5",
                    hour === 0 ? "top-1" : "-top-2"
                  )}
                >
                  {hourLabel(hour)}
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const isToday = day.key === todayKey;
            return (
              <div
                key={day.key}
                className={cn("relative border-s", onSelectSlot && "cursor-pointer")}
                style={{ height: 24 * HOUR_PX }}
                onClick={handleColumnClick(day.key)}
              >
                {businessHours.length > 0 &&
                  closedIntervals(businessHours, day.weekday).map((interval) => (
                    <div
                      key={interval.start}
                      aria-hidden
                      className="absolute inset-x-0 bg-muted/50"
                      style={{
                        top: (interval.start / 60) * HOUR_PX,
                        height: ((interval.end - interval.start) / 60) * HOUR_PX,
                      }}
                    />
                  ))}

                {Array.from({ length: 24 }, (_, hour) => (
                  <div
                    key={hour}
                    aria-hidden
                    className="absolute inset-x-0 border-b border-border/60"
                    style={{ top: (hour + 1) * HOUR_PX - 1 }}
                  />
                ))}

                {isToday && (
                  <div
                    aria-hidden
                    className="absolute inset-x-0 z-20 flex items-center"
                    style={{ top: (nowMin / 60) * HOUR_PX - 1 }}
                  >
                    <span className="-ms-1 size-2 rounded-full bg-destructive" />
                    <span className="h-0.5 flex-1 bg-destructive" />
                  </div>
                )}

                {day.positioned.map((positioned) => (
                  <EventBlock
                    key={positioned.event.key}
                    event={positioned.event}
                    timeZone={timeZone}
                    top={(positioned.startMin / 60) * HOUR_PX}
                    height={((positioned.endMin - positioned.startMin) / 60) * HOUR_PX - 2}
                    leftPct={(positioned.column / positioned.columns) * 100}
                    widthPct={(1 / positioned.columns) * 100}
                    onSelect={onSelectEvent}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
