import { z } from "zod";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import type { ApiError } from "@/lib/api/errors";
import type { StoreAppointmentPayload } from "@/lib/api/types";
import { zonedDateTimeToUtcIso } from "@/lib/datetime";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";

/**
 * Staff bookings deliberately skip slot enforcement server-side (double-booking
 * is allowed), so the only backend rejections are shape ones — `starts_at`
 * after:now being the interesting case, remapped onto the time field.
 */
export const createAppointmentSchema = z
  .object({
    contact_id: z.string().min(1, "Choose a contact"),
    /** User uuid; "" = the unassigned pool. */
    member_id: z.string(),
    date: z.string().min(1, "Pick a date"),
    /** A slot's UTC instant, or "" when a custom time is typed instead. */
    slot_iso: z.string(),
    time: z.string(),
    notes: z.string().max(2000, "Keep the notes under 2,000 characters"),
  })
  .superRefine((values, ctx) => {
    if (!values.slot_iso && !values.time) {
      ctx.addIssue({ code: "custom", path: ["time"], message: "Pick a time" });
    }
  });

export type CreateAppointmentValues = z.infer<typeof createAppointmentSchema>;

export function defaultCreateAppointmentValues(
  overrides: Partial<CreateAppointmentValues> = {}
): CreateAppointmentValues {
  return {
    contact_id: "",
    member_id: "",
    date: "",
    slot_iso: "",
    time: "",
    notes: "",
    ...overrides,
  };
}

export function toStoreAppointmentPayload(
  values: CreateAppointmentValues,
  timeZone: string
): StoreAppointmentPayload {
  const notes = values.notes.trim();
  return {
    contact_id: values.contact_id,
    starts_at: values.slot_iso || zonedDateTimeToUtcIso(values.date, values.time, timeZone),
    ...(values.member_id ? { member_id: values.member_id } : {}),
    ...(notes ? { notes } : {}),
  };
}

export const rescheduleAppointmentSchema = z
  .object({
    date: z.string().min(1, "Pick a date"),
    slot_iso: z.string(),
    time: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!values.slot_iso && !values.time) {
      ctx.addIssue({ code: "custom", path: ["time"], message: "Pick a time" });
    }
  });

export type RescheduleAppointmentValues = z.infer<typeof rescheduleAppointmentSchema>;

export function toRescheduleAppointmentPayload(
  values: RescheduleAppointmentValues,
  timeZone: string
): { starts_at: string } {
  return {
    starts_at: values.slot_iso || zonedDateTimeToUtcIso(values.date, values.time, timeZone),
  };
}

/** The backend validates `starts_at`; on these forms that's the time pair. */
export function applyAppointmentServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: ApiError
): void {
  applyServerErrors(form, error, {
    mapKey: (key) => (key === "starts_at" ? "time" : key),
  });
}
