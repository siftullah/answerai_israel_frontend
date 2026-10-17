"use client";

import { CalendarIcon, PhoneIcon, WrenchIcon } from "lucide-react";
import { formatTimeOfDay } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { GridEvent } from "@/components/calendar/calendar-lib";

/**
 * Grid color language: every kind is a solid fill from its own hue band —
 * appointments indigo, callbacks fuchsia, jobs emerald (the event-* theme
 * tokens, kept apart from the CTA blues). Exceptional statuses override with
 * solid semantic fills; "active" keeps the kind fill and relies on the pulse
 * dot. External events stay neutral; our synced copies borrow the appointment
 * fill. The detail dialog carries the exact status badge.
 */
const KIND_CLASSES: Record<GridEvent["kind"], string> = {
  appointment: "bg-event-appointment text-white hover:bg-event-appointment/90",
  callback: "bg-event-callback text-white hover:bg-event-callback/90",
  job: "bg-event-job text-white hover:bg-event-job/90",
  external: "bg-muted text-foreground/80 hover:bg-muted/80",
  "external-ours": "bg-event-appointment text-white hover:bg-event-appointment/90",
};

const TONE_CLASSES: Partial<Record<GridEvent["tone"], string>> = {
  done: "bg-muted text-muted-foreground hover:bg-muted/80",
  attention: "bg-warning text-white hover:bg-warning/90 dark:text-background",
  danger: "bg-destructive text-white hover:bg-destructive/90",
  free: "border border-dashed border-border bg-transparent text-muted-foreground hover:bg-muted/50",
};

const DOT_KIND_CLASSES: Record<GridEvent["kind"], string> = {
  appointment: "bg-event-appointment",
  callback: "bg-event-callback",
  job: "bg-event-job",
  external: "bg-muted-foreground",
  "external-ours": "bg-event-appointment",
};

const DOT_TONE_CLASSES: Partial<Record<GridEvent["tone"], string>> = {
  done: "bg-muted-foreground/60",
  attention: "bg-warning",
  danger: "bg-destructive",
  free: "bg-muted-foreground/50",
};

function eventClasses(event: GridEvent): string {
  return TONE_CLASSES[event.tone] ?? KIND_CLASSES[event.kind];
}

export function eventDotClass(event: GridEvent): string {
  return DOT_TONE_CLASSES[event.tone] ?? DOT_KIND_CLASSES[event.kind];
}

function KindIcon({ event }: { event: GridEvent }) {
  if (event.kind === "callback") {
    return <PhoneIcon aria-hidden className="size-3 shrink-0" />;
  }
  if (event.kind === "job") {
    return <WrenchIcon aria-hidden className="size-3 shrink-0" />;
  }
  if (event.kind === "appointment" || event.kind === "external-ours") {
    return <CalendarIcon aria-hidden className="size-3 shrink-0" />;
  }
  return null;
}

/** Absolutely-positioned block inside a time-grid day column. */
export function EventBlock({
  event,
  timeZone,
  top,
  height,
  leftPct,
  widthPct,
  onSelect,
}: {
  event: GridEvent;
  timeZone: string;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
  onSelect: (event: GridEvent) => void;
}) {
  const compact = height < 34;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(event);
      }}
      title={`${formatTimeOfDay(event.starts_at, timeZone)} · ${event.title}`}
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
      className={cn(
        "absolute z-10 flex flex-col overflow-hidden rounded-md px-1.5 py-0.5 text-left text-xs leading-tight transition-colors",
        eventClasses(event)
      )}
    >
      <span className="flex min-w-0 items-center gap-1">
        {event.tone === "active" && (
          <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-current" aria-hidden />
        )}
        <KindIcon event={event} />
        <span className={cn("truncate font-medium", event.tone === "done" && "line-through")}>
          {event.title}
        </span>
      </span>
      {!compact && (
        <span className="truncate opacity-80">{formatTimeOfDay(event.starts_at, timeZone)}</span>
      )}
    </button>
  );
}

/** Compact chip for month cells and all-day rows. */
export function EventChip({
  event,
  timeZone,
  showTime = true,
  onSelect,
}: {
  event: GridEvent;
  timeZone: string;
  showTime?: boolean;
  onSelect: (event: GridEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(event);
      }}
      title={`${formatTimeOfDay(event.starts_at, timeZone)} · ${event.title}`}
      className={cn(
        "flex w-full min-w-0 items-center gap-1 rounded-sm px-1 py-px text-left text-xs transition-colors",
        eventClasses(event)
      )}
    >
      {showTime && !event.allDay && (
        <span className="shrink-0 tabular-nums opacity-80">
          {formatTimeOfDay(event.starts_at, timeZone).replace(" ", "")}
        </span>
      )}
      <span className={cn("truncate", event.tone === "done" && "line-through")}>
        {event.title}
      </span>
    </button>
  );
}
