import { z } from "zod";
import type { Business, BusinessHourRow } from "@/lib/api/types";
import type { Translator } from "@/lib/i18n/types";
import {
  hourRowSchema,
  toEditableWeek,
  validateHourRows,
} from "@/lib/validation/weekly-hours";

/** `t` is a translator scoped to the `validation` namespace. */
export function businessDetailsSchema(t: Translator) {
  return z
    .object({
      name: z
        .string()
        .min(1, t("common.businessNameRequired"))
        .max(200, t("length.name", { max: 200 })),
      /** The picker constrains choices to Intl values; the backend IANA-validates. */
      timezone: z.string().min(1, t("business.timezoneRequired")),
      trading_hours: z.array(hourRowSchema),
    })
    .superRefine((values, ctx) => {
      validateHourRows(t, values.trading_hours, ctx, ["trading_hours"]);
    });
}

export type BusinessDetailsValues = z.infer<ReturnType<typeof businessDetailsSchema>>;

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
