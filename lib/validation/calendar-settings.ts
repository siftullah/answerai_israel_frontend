import { z } from "zod";
import type {
  CalendarBusinessSettings,
  UpdateCalendarBusinessSettingsPayload,
} from "@/lib/api/types";
import type { Translator } from "@/lib/i18n/types";

const intInRange = (
  min: number,
  max: number,
  message: (range: { min: number; max: number }) => string
) =>
  z
    .string()
    .refine(
      (v) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max,
      message({ min, max })
    );

/** `t` is a translator scoped to the `validation` namespace. */
export function calendarSettingsSchema(t: Translator) {
  const minutes = (range: { min: number; max: number }) => t("range.minutes", range);
  return z
    .object({
      slot_interval_minutes: z.string(),
      min_notice_minutes: intInRange(0, 10080, (range) =>
        t("range.minutesWithDays", { ...range, days: 7 })
      ),
      max_horizon_days: intInRange(1, 365, (range) => t("range.days", range)),
      buffer_minutes: intInRange(0, 240, minutes),
      limit_bookings: z.boolean(),
      max_bookings_per_day: z.string(),
      appointment_duration_minutes: intInRange(5, 1440, minutes),
      callback_duration_minutes: intInRange(5, 240, minutes),
    })
    .superRefine((values, ctx) => {
      if (values.limit_bookings) {
        const n = Number(values.max_bookings_per_day);
        if (!/^\d+$/.test(values.max_bookings_per_day) || n < 1 || n > 100) {
          ctx.addIssue({
            code: "custom",
            path: ["max_bookings_per_day"],
            message: t("range.bookings", { min: 1, max: 100 }),
          });
        }
      }
    });
}

export type CalendarSettingsValues = z.infer<ReturnType<typeof calendarSettingsSchema>>;

export function toCalendarSettingsValues(
  settings: CalendarBusinessSettings
): CalendarSettingsValues {
  return {
    slot_interval_minutes: String(settings.slot_interval_minutes),
    min_notice_minutes: String(settings.min_notice_minutes),
    max_horizon_days: String(settings.max_horizon_days),
    buffer_minutes: String(settings.buffer_minutes),
    limit_bookings: settings.max_bookings_per_day !== null,
    max_bookings_per_day: settings.max_bookings_per_day?.toString() ?? "",
    appointment_duration_minutes: String(settings.appointment_duration_minutes),
    callback_duration_minutes: String(settings.callback_duration_minutes),
  };
}

export function toCalendarSettingsPayload(
  values: CalendarSettingsValues
): UpdateCalendarBusinessSettingsPayload {
  return {
    slot_interval_minutes: Number(values.slot_interval_minutes),
    min_notice_minutes: Number(values.min_notice_minutes),
    max_horizon_days: Number(values.max_horizon_days),
    buffer_minutes: Number(values.buffer_minutes),
    max_bookings_per_day: values.limit_bookings ? Number(values.max_bookings_per_day) : null,
    appointment_duration_minutes: Number(values.appointment_duration_minutes),
    callback_duration_minutes: Number(values.callback_duration_minutes),
  };
}
