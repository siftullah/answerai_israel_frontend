"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { dayKey, formatDateKey } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import {
  dayOfMonth,
  weekdayShort,
  type GridEvent,
} from "@/components/calendar/calendar-lib";
import { EventChip } from "@/components/calendar/event-block";

const MAX_CHIPS = 3;

/**
 * Six-week month grid. Chips open the detail dialog; day numbers and the
 * "+N more" overflow jump to that date's day view.
 */
export function MonthGrid({
  dayKeys,
  monthKey,
  timeZone,
  todayKey,
  events,
  onSelectEvent,
  onSelectDay,
}: {
  /** 42 business-zone day keys, Sunday-started. */
  dayKeys: string[];
  /** First of the displayed month — days outside it render muted. */
  monthKey: string;
  timeZone: string;
  todayKey: string;
  events: GridEvent[];
  onSelectEvent: (event: GridEvent) => void;
  onSelectDay: (dateKey: string) => void;
}) {
  const t = useTranslations("calendar.grid");
  const byDay = useMemo(() => {
    const map = new Map<string, GridEvent[]>();
    for (const event of events) {
      const key = dayKey(event.starts_at, timeZone);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
    }
    return map;
  }, [events, timeZone]);

  const month = monthKey.slice(0, 7);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-background">
        {dayKeys.slice(0, 7).map((key) => (
          <div
            key={key}
            className="border-s py-2 text-center text-sm text-muted-foreground first:border-s-0"
          >
            {weekdayShort(key)}
          </div>
        ))}
      </div>
      {/* Rows never shrink below their content (min-content floor) so full days
          can't bleed over the next week's date numbers; spare height still
          stretches rows evenly via the 1fr max. */}
      <div className="scrollbar-slim grid min-h-0 flex-1 auto-rows-[minmax(min-content,1fr)] grid-cols-7 overflow-y-auto">
        {dayKeys.map((key, index) => {
          const inMonth = key.slice(0, 7) === month;
          const isToday = key === todayKey;
          const dayEvents = byDay.get(key) ?? [];
          const overflow = dayEvents.length - MAX_CHIPS;

          return (
            <div
              key={key}
              className={cn(
                "flex min-h-24 flex-col gap-1 border-b border-s p-1.5 first:border-s-0",
                index % 7 === 0 && "border-s-0",
                index >= 35 && "border-b-0",
                !inMonth && "bg-muted/30"
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(key)}
                className={cn(
                  "flex size-6 items-center justify-center self-start rounded-full text-sm tabular-nums hover:bg-muted",
                  !inMonth && "text-muted-foreground",
                  isToday && "bg-primary font-medium text-primary-foreground hover:bg-primary/90"
                )}
                aria-label={t("openDay", { date: formatDateKey(key) })}
              >
                {dayOfMonth(key)}
              </button>

              <div className="flex min-w-0 flex-col gap-0.5">
                {dayEvents.slice(0, MAX_CHIPS).map((event) => (
                  <EventChip
                    key={event.key}
                    event={event}
                    timeZone={timeZone}
                    onSelect={onSelectEvent}
                  />
                ))}
                {overflow > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectDay(key)}
                    className="self-start rounded-sm px-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {t("more", { count: overflow })}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
