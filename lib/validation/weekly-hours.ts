import { z } from "zod";
import type {
  BusinessHourRow,
  BusinessHourRowApiPayload,
  BusinessHourRowPayload,
} from "@/lib/api/types";
import { WEEKDAYS } from "@/lib/api/types";
import type { Translator } from "@/lib/i18n/types";

export const hoursWindowSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const hourRowSchema = z.object({
  day: z.enum(WEEKDAYS),
  is_available: z.boolean(),
  windows: z.array(hoursWindowSchema),
});

export type HourRowValues = z.infer<typeof hourRowSchema>;

/** Shared superRefine body for weekly-hours fields: every available day needs
 * at least one window, and windows must end after they start. `t` is scoped
 * to the `validation` namespace; the messages ICU-select the day name. */
export function validateHourRows(
  t: Translator,
  rows: HourRowValues[],
  ctx: z.RefinementCtx,
  path: (string | number)[]
): void {
  for (const row of rows) {
    if (!row.is_available) continue;
    if (row.windows.length === 0) {
      ctx.addIssue({
        code: "custom",
        path,
        message: t("weeklyHours.windowRequired", { day: row.day }),
      });
      break;
    }
    if (row.windows.some((window) => window.start >= window.end)) {
      ctx.addIssue({
        code: "custom",
        path,
        message: t("weeklyHours.windowOrder", { day: row.day }),
      });
      break;
    }
  }
}

/** Editor rows → wire rows: unavailable days drop the windows key entirely
 * (the backend rejects an empty array with its min:1 rule). */
export function toApiHourRows(rows: BusinessHourRowPayload[]): BusinessHourRowApiPayload[] {
  return rows.map((row) =>
    row.is_available
      ? { day: row.day, is_available: true, windows: row.windows }
      : { day: row.day, is_available: false }
  );
}

export function defaultWeeklyHours(): BusinessHourRowPayload[] {
  return WEEKDAYS.map((day) => ({
    day,
    is_available: day !== "saturday" && day !== "sunday",
    windows:
      day !== "saturday" && day !== "sunday" ? [{ start: "09:00", end: "17:00" }] : [],
  }));
}

/**
 * The API returns only the rows that were saved (and null windows on
 * unavailable days) — rebuild a complete editable week: saved rows win,
 * absent days are unavailable.
 */
export function toEditableWeek(saved: BusinessHourRow[] | undefined): BusinessHourRowPayload[] {
  if (!saved || saved.length === 0) return defaultWeeklyHours();
  return WEEKDAYS.map((day) => {
    const row = saved.find((r) => r.day === day);
    return row
      ? { day, is_available: row.is_available, windows: row.windows ?? [] }
      : { day, is_available: false, windows: [] };
  });
}
