import { z } from "zod";
import type { Business, BusinessHourRow } from "@/lib/api/types";
import {
  hourRowSchema,
  toEditableWeek,
  validateHourRows,
} from "@/lib/validation/weekly-hours";

export const businessDetailsSchema = z
  .object({
    name: z.string().min(1, "Business name is required").max(200, "Keep the name under 200 characters"),
    /** The picker constrains choices to Intl values; the backend IANA-validates. */
    timezone: z.string().min(1, "Pick a timezone"),
    trading_hours: z.array(hourRowSchema),
  })
  .superRefine((values, ctx) => {
    validateHourRows(values.trading_hours, ctx, ["trading_hours"]);
  });

export type BusinessDetailsValues = z.infer<typeof businessDetailsSchema>;

export function toBusinessDetailsValues(
  business: Business,
  hours: BusinessHourRow[]
): BusinessDetailsValues {
  return {
    name: business.name,
    timezone: business.timezone,
    trading_hours: toEditableWeek(hours),
  };
}

/** PUT /business-hours 422 keys (`days.*`) land on the editor's field. */
export function businessDetailsServerFieldKey(key: string): string {
  return key === "days" || key.startsWith("days.") ? "trading_hours" : key;
}
