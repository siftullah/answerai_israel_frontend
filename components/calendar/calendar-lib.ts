import type { ConnectedCalendarEvent, SystemCalendarItem } from "@/lib/api/types";
import { dayKey, parseDateKey, zonedMinutesOfDay } from "@/lib/datetime";

export type CalendarViewMode = "month" | "week" | "day";
export type CalendarSource = "system" | "connected";

export const CALENDAR_VIEW_MODES: readonly CalendarViewMode[] = ["month", "week", "day"];

export const CALENDAR_VIEW_LABELS: Record<CalendarViewMode, string> = {
  month: "Month",
  week: "Week",
  day: "Day",
};

/**
 * One renderable block, whichever source it came from. `tone` collapses status
 * to what matters at a glance on the grid — the detail dialog carries the full
 * status badge.
 */
export interface GridEvent {
  key: string;
  title: string;
  starts_at: string;
  ends_at: string;
  allDay: boolean;
  kind: "appointment" | "callback" | "job" | "external" | "external-ours";
  tone: "default" | "active" | "done" | "attention" | "danger" | "free";
  item?: SystemCalendarItem;
  external?: ConnectedCalendarEvent;
}

/**
 * `nowMs` comes in as a number (epoch ms) — API timestamps carry a `+10:00`
 * offset, so instants must be compared through Date.parse, never as strings.
 */
export function systemItemToGridEvent(item: SystemCalendarItem, nowMs: number): GridEvent {
  let tone: GridEvent["tone"] = "default";
  if (item.type === "appointment") {
    if (item.status === "completed") tone = "done";
    else if (item.status === "no_show") tone = "attention";
  } else if (item.type === "callback") {
    if (item.status === "completed") tone = "done";
    else if (item.status === "no_answer") tone = "attention";
    else if (item.status === "failed") tone = "danger";
    else if (item.status === "queued" || item.status === "in_progress") tone = "active";
    else if (item.status === "scheduled" && Date.parse(item.starts_at) < nowMs)
      tone = "attention";
  } else {
    // Terminal jobs never arrive; an overdue visit start reads as attention.
    if (item.status === "in_progress") tone = "active";
    else if (item.status === "scheduled" && Date.parse(item.starts_at) < nowMs)
      tone = "attention";
  }

  return {
    key: `${item.type}:${item.id}`,
    title: item.title,
    starts_at: item.starts_at,
    ends_at: item.ends_at,
    allDay: false,
    kind: item.type,
    tone,
    item,
  };
}

export function externalEventToGridEvent(event: ConnectedCalendarEvent): GridEvent {
  return {
    key: `external:${event.id}`,
    title: event.title,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    allDay: event.all_day,
    kind: event.is_ours ? "external-ours" : "external",
    tone: event.busy ? "default" : "free",
    external: event,
  };
}

/* ---------------------------------------------------------------------------
 * Day-column layout
 * ------------------------------------------------------------------------ */

export interface TimedGridEvent {
  event: GridEvent;
  /** Minutes past the column's (business-zone) midnight, clamped to the day. */
  startMin: number;
  endMin: number;
}

export interface PositionedGridEvent extends TimedGridEvent {
  column: number;
  columns: number;
}

const MIN_BLOCK_MINUTES = 20;

/**
 * The timed events falling on one business-zone day, clamped to it (an event
 * running past midnight fills to the bottom; its tail is not re-drawn on the
 * next day — starts are what the eye scans a calendar for).
 */
export function eventsForDay(
  events: GridEvent[],
  key: string,
  timeZone: string
): TimedGridEvent[] {
  return events
    .filter((event) => !event.allDay && dayKey(event.starts_at, timeZone) === key)
    .map((event) => {
      const startMin = zonedMinutesOfDay(event.starts_at, timeZone);
      const sameDay = dayKey(event.ends_at, timeZone) === key;
      const endMin = sameDay ? zonedMinutesOfDay(event.ends_at, timeZone) : 24 * 60;
      return {
        event,
        startMin,
        endMin: Math.min(24 * 60, Math.max(endMin, startMin + MIN_BLOCK_MINUTES)),
      };
    });
}

/**
 * Greedy column assignment: overlapping events split the column's width, and
 * every member of a transitive overlap cluster shares the cluster's column
 * count so widths line up.
 */
export function layoutOverlaps(items: TimedGridEvent[]): PositionedGridEvent[] {
  const sorted = [...items].sort(
    (a, b) => a.startMin - b.startMin || b.endMin - a.endMin
  );

  const out: PositionedGridEvent[] = [];
  let cluster: PositionedGridEvent[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = 0;

  const flush = () => {
    for (const positioned of cluster) positioned.columns = columnEnds.length;
    cluster = [];
    columnEnds = [];
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.startMin >= clusterEnd) flush();

    let column = columnEnds.findIndex((end) => end <= item.startMin);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(0);
    }
    columnEnds[column] = item.endMin;

    const positioned: PositionedGridEvent = { ...item, column, columns: 1 };
    cluster.push(positioned);
    out.push(positioned);
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  flush();

  return out;
}

/* ---------------------------------------------------------------------------
 * Labels — all from zone-less calendar keys (see lib/datetime's key rules).
 * ------------------------------------------------------------------------ */

/** "July 2026" */
export function formatMonthTitle(key: string): string {
  const date = parseDateKey(key);
  return date ? date.toLocaleDateString("en-AU", { month: "long", year: "numeric" }) : key;
}

/** "27 Jul – 2 Aug 2026" */
export function formatWeekTitle(startKey: string, endKey: string): string {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  if (!start || !end) return startKey;
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString(
    "en-AU",
    sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" }
  );
  const endLabel = end.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

/** "Monday 27 July 2026" */
export function formatDayTitle(key: string): string {
  const date = parseDateKey(key);
  return date
    ? date.toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : key;
}

/** "Mon" */
export function weekdayShort(key: string): string {
  const date = parseDateKey(key);
  return date ? date.toLocaleDateString("en-AU", { weekday: "short" }) : key;
}

/** Day-of-month number for headers and month cells. */
export function dayOfMonth(key: string): number {
  return Number(key.slice(8)) || 0;
}

/** "9 am" / "12 pm" — hour ruler labels. */
export function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? "am" : "pm"}`;
}
