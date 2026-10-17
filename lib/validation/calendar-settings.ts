import { z } from "zod";
import type {
  CalendarBusinessSettings,
  UpdateCalendarBusinessSettingsPayload,
} from "@/lib/api/types";

const intInRange = (min: number, max: number, message: string) =>
  z
    .string()
    .refine(
      (v) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max,
      message
    );

export const calendarSettingsSchema = z
  .object({
    slot_interval_minutes: z.string(),
    min_notice_minutes: intInRange(0, 10080, "Between 0 and 10,080 minutes (7 days)"),
    max_horizon_days: intInRange(1, 365, "Between 1 and 365 days"),
    buffer_minutes: intInRange(0, 240, "Between 0 and 240 minutes"),
    limit_bookings: z.boolean(),
    max_bookings_per_day: z.string(),
    appointment_duration_minutes: intInRange(5, 1440, "Between 5 and 1,440 minutes"),
    callback_duration_minutes: intInRange(5, 240, "Between 5 and 240 minutes"),
  })
  .superRefine((values, ctx) => {
    if (values.limit_bookings) {
      const n = Number(values.max_bookings_per_day);
      if (!/^\d+$/.test(values.max_bookings_per_day) || n < 1 || n > 100) {
        ctx.addIssue({
          code: "custom",
          path: ["max_bookings_per_day"],
          message: "Between 1 and 100 bookings",
        });
      }
    }
  });

export type CalendarSettingsValues = z.infer<typeof calendarSettingsSchema>;

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
