import { displayLocale, rt, runtimeLocale } from "@/lib/i18n/runtime";

/** 187 → "3:07"; 3727 → "1:02:07". */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Transcript timestamp offset — same shape as durations. */
export function formatOffset(t0Secs: number): string {
  return formatDuration(t0Secs);
}

/**
 * Display locale for every date and time formatter follows the UI language
 * (i18n/config intlLocales): en-IL / he-IL / ar-PS, all with Latin digits
 * and no bidi marks (the same reasoning as lib/money.ts). English keeps the
 * 12-hour am/pm clock the design calls for; Hebrew and Arabic read 24-hour.
 */
function hour12(): boolean {
  return runtimeLocale() === "en";
}

function timeOptions(): Intl.DateTimeFormatOptions {
  return { hour: "numeric", minute: "2-digit", hour12: hour12() };
}

/**
 * Timestamps arrive from the API in UTC. Every formatter takes the business
 * timezone (e.g. "Asia/Jerusalem") so times render in the business's local
 * time regardless of where the viewer is — pass `business.timezone`. Omitting
 * it falls back to the browser's zone.
 */

/** Bare time of day: "10:32 am" — for rows already under a day heading. */
export function formatTimeOfDay(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleTimeString(displayLocale(), { ...timeOptions(), timeZone });
}

/** Compact date + time for list rows: "27 Jul 2026 - 03:15 PM". */
export function formatDateAndTime(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString(displayLocale(), {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  // Leading-zero hour + uppercase AM/PM is what the design calls for; the
  // locale renders "03:15 pm", and the string is only digits, ":" and am/pm.
  const time = date
    .toLocaleTimeString(displayLocale(), {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: hour12(),
    })
    .toUpperCase();
  return `${day} - ${time}`;
}

/** Calendar-day key for grouping list rows, in the business zone: "2026-07-24". */
export function dayKey(iso: string, timeZone?: string): string {
  // en-CA renders as YYYY-MM-DD; the timeZone option shifts the calendar day.
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** Day-group heading: "Today" | "Yesterday" | "Mon, 14 Jul" | "14 Jul 2025". */
export function formatDayHeading(iso: string, timeZone?: string): string {
  const key = dayKey(iso, timeZone);
  const nowKey = dayKey(new Date().toISOString(), timeZone);
  if (key === nowKey) return rt("lib.datetime.today");

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === dayKey(yesterday.toISOString(), timeZone)) return rt("lib.datetime.yesterday");

  const sameYear = key.slice(0, 4) === nowKey.slice(0, 4);
  return new Date(iso).toLocaleDateString(displayLocale(), {
    timeZone,
    weekday: sameYear ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
}

/** Full timestamp for detail views: "24 Jul 2026, 10:32 am". */
export function formatDateTime(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleString(displayLocale(), {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...timeOptions(),
  });
}

/** Date only, no time — for expiry/updated columns: "24 Jul 2026". */
export function formatDate(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleDateString(displayLocale(), {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Offset of `timeZone` from UTC at the given instant, in milliseconds. */
function tzOffsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asUtc - at.getTime();
}

/**
 * Compose a wall-clock date + time in a zone into a UTC instant:
 * ("2026-07-28", "14:30", "Asia/Jerusalem") → "2026-07-28T11:30:00.000Z".
 * Two-pass so the offset is taken at the target instant, not "now" — this
 * lands DST transitions correctly (nonexistent spring-forward times resolve
 * to the shifted instant).
 */
export function zonedDateTimeToUtcIso(date: string, time: string, timeZone: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  let ts = naive - tzOffsetMs(timeZone, new Date(naive));
  ts = naive - tzOffsetMs(timeZone, new Date(ts));
  return new Date(ts).toISOString();
}

/** Inverse of zonedDateTimeToUtcIso, for prefilling schedule forms. */
export function utcIsoToZonedFields(
  iso: string,
  timeZone?: string
): { date: string; time: string } {
  return {
    date: dayKey(iso, timeZone),
    time: new Date(iso).toLocaleTimeString("en-GB", {
      timeZone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

/** The zone's calendar day containing `base`, as an inclusive UTC instant pair. */
export function businessDayUtcRange(
  timeZone: string,
  base: Date = new Date()
): { startIso: string; endIso: string } {
  const key = dayKey(base.toISOString(), timeZone);
  const [year, month, day] = key.split("-").map(Number);
  const nextKey = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  const startIso = zonedDateTimeToUtcIso(key, "00:00", timeZone);
  const endIso = new Date(
    Date.parse(zonedDateTimeToUtcIso(nextKey, "00:00", timeZone)) - 1000
  ).toISOString();
  return { startIso, endIso };
}

/* ---------------------------------------------------------------------------
 * Calendar keys ("YYYY-MM-DD") — a wall-clock day with no zone attached.
 *
 * Never hand a calendar key to formatDate/dayKey/formatDateTime above: those
 * take a UTC instant, and `new Date("2026-07-28")` parses as UTC midnight,
 * which renders as 27 Jul in any zone west of UTC (and as 2 or 3 am in
 * Asia/Jerusalem). dayKey() goes instant → key; the three helpers below are
 * the only safe way back.
 * ------------------------------------------------------------------------ */

/** "2026-07-28" → a local-midnight Date. "" or malformed → undefined. */
export function parseDateKey(key: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return undefined;
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** A local Date → its calendar key: "2026-07-28". */
export function toDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A calendar key for display: "28 July 2026". Unparseable keys pass through. */
export function formatDateKey(key: string): string {
  const date = parseDateKey(key);
  return date
    ? date.toLocaleDateString(displayLocale(), { day: "numeric", month: "long", year: "numeric" })
    : key;
}

/* ---------------------------------------------------------------------------
 * Calendar-key arithmetic — pure wall-clock math for the calendar grids.
 * Malformed keys pass through unchanged, matching formatDateKey.
 * ------------------------------------------------------------------------ */

/** "2026-07-28" + 7 → "2026-08-04". */
export function addDaysToDateKey(key: string, days: number): string {
  const date = parseDateKey(key);
  if (!date) return key;
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** The first day of the month `months` away — month-view paging. */
export function addMonthsToDateKey(key: string, months: number): string {
  const date = parseDateKey(key);
  return date ? toDateKey(new Date(date.getFullYear(), date.getMonth() + months, 1)) : key;
}

/** The Sunday starting the week that contains the key (Israeli week). */
export function startOfWeekDateKey(key: string): string {
  const date = parseDateKey(key);
  if (!date) return key;
  date.setDate(date.getDate() - date.getDay());
  return toDateKey(date);
}

/** The first day of the key's month. */
export function startOfMonthDateKey(key: string): string {
  const date = parseDateKey(key);
  return date ? toDateKey(new Date(date.getFullYear(), date.getMonth(), 1)) : key;
}

/** The zone's [fromKey 00:00, toKeyExclusive 00:00) window as UTC instants. */
export function zonedDayRangeToUtc(
  fromKey: string,
  toKeyExclusive: string,
  timeZone: string
): { fromIso: string; toIso: string } {
  return {
    fromIso: zonedDateTimeToUtcIso(fromKey, "00:00", timeZone),
    toIso: zonedDateTimeToUtcIso(toKeyExclusive, "00:00", timeZone),
  };
}

/** Minutes past the zone's midnight at a UTC instant — time-grid positioning. */
export function zonedMinutesOfDay(iso: string, timeZone?: string): number {
  const [hour, minute] = new Date(iso)
    .toLocaleTimeString("en-GB", { timeZone, hour12: false, hour: "2-digit", minute: "2-digit" })
    .split(":")
    .map(Number);
  // Some engines render midnight as "24:00" under h23 formatting.
  return (hour % 24) * 60 + minute;
}
