import { z } from "zod";
import type { BusinessProfile, UpdateBusinessProfilePayload } from "@/lib/api/types";
import { SOCIAL_KEYS } from "@/lib/api/types";
import { formatE164, normalizeAuPhone, optionalAuPhoneField } from "@/lib/phone";
import type { Translator } from "@/lib/i18n/types";

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Form-facing schema: text inputs hold "" for unset values (the payload
 * builder converts to null), numeric inputs hold strings. `t` is a
 * translator scoped to the `validation` namespace.
 */
export function businessProfileSchema(t: Translator) {
  const optionalEmail = z.union([z.literal(""), z.email(t("common.emailInvalid"))]);
  const socialUrl = z.union([
    z.literal(""),
    z.url(t("common.urlInvalid")).max(500, t("length.url", { max: 500 })),
  ]);

  return z.object({
    public_email: optionalEmail,
    // Loose AU shape gate; the backend's Phone rule stays the authority.
    public_phone: optionalAuPhoneField(t),
    website: z.union([
      z.literal(""),
      z.url(t("common.urlInvalid")).max(2000, t("length.url", { max: 2000 })),
    ]),
    country: z.string(),
    currency: z.string(),
    description: z.string().max(5000, t("length.description", { max: 5000 })),
    categories: z
      .array(z.string().min(1).max(60, t("length.category", { max: 60 })))
      .max(10, t("count.categories", { max: 10 })),
    year_founded: z
      .string()
      .refine(
        (v) => v === "" || (/^\d{4}$/.test(v) && Number(v) >= 1800 && Number(v) <= CURRENT_YEAR),
        t("businessProfile.yearRange", { min: 1800, max: CURRENT_YEAR })
      ),
    socials: z.object({
      facebook: socialUrl,
      instagram: socialUrl,
      linkedin: socialUrl,
      tiktok: socialUrl,
      youtube: socialUrl,
      x: socialUrl,
    }),
    location_type: z.union([z.literal(""), z.enum(["fixed", "mobile", "online"])]),
    address: z.string().max(500, t("length.address", { max: 500 })),
    landmark: z.string().max(255, t("length.landmark", { max: 255 })),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    base_location: z.string().max(500, t("length.baseLocation", { max: 500 })),
    travel_radius_km: z
      .string()
      .refine(
        (v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 1000),
        t("businessProfile.travelRadiusRange", { min: 1, max: 1000 })
      ),
  });
}

export type BusinessProfileValues = z.infer<ReturnType<typeof businessProfileSchema>>;

export function toBusinessProfileValues(profile: BusinessProfile): BusinessProfileValues {
  return {
    public_email: profile.public_email ?? "",
    public_phone: profile.public_phone ? formatE164(profile.public_phone) : "",
    website: profile.website ?? "",
    country: profile.country ?? "",
    currency: profile.currency ?? "",
    description: profile.description ?? "",
    categories: profile.categories ?? [],
    year_founded: profile.year_founded?.toString() ?? "",
    socials: Object.fromEntries(
      SOCIAL_KEYS.map((key) => [key, profile.socials?.[key] ?? ""])
    ) as BusinessProfileValues["socials"],
    location_type: profile.location_type ?? "",
    address: profile.address ?? "",
    landmark: profile.landmark ?? "",
    latitude: profile.latitude,
    longitude: profile.longitude,
    base_location: profile.base_location ?? "",
    travel_radius_km: profile.travel_radius_km?.toString() ?? "",
  };
}

const emptyToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

/**
 * Builds the PATCH body from ONLY the dirty fields (the backend treats
 * every field as `sometimes`). `socials` and lat/lng are sent whole once
 * any part of them changed.
 */
export function toUpdatePayload(
  values: BusinessProfileValues,
  dirty: Partial<Record<keyof BusinessProfileValues, unknown>>
): UpdateBusinessProfilePayload {
  const payload: UpdateBusinessProfilePayload = {};

  if (dirty.public_email) payload.public_email = emptyToNull(values.public_email);
  if (dirty.public_phone) {
    payload.public_phone =
      values.public_phone === "" ? null : normalizeAuPhone(values.public_phone);
  }
  if (dirty.website) payload.website = emptyToNull(values.website);
  if (dirty.country) payload.country = emptyToNull(values.country);
  if (dirty.currency) payload.currency = emptyToNull(values.currency);
  if (dirty.description) payload.description = emptyToNull(values.description);
  if (dirty.categories) {
    payload.categories = values.categories.length > 0 ? values.categories : null;
  }
  if (dirty.year_founded) {
    payload.year_founded = values.year_founded === "" ? null : Number(values.year_founded);
  }
  if (dirty.socials) {
    payload.socials = Object.fromEntries(
      SOCIAL_KEYS.map((key) => [key, emptyToNull(values.socials[key])])
    ) as UpdateBusinessProfilePayload["socials"];
  }
  if (dirty.location_type) {
    payload.location_type = values.location_type === "" ? null : values.location_type;
  }
  if (dirty.address) payload.address = emptyToNull(values.address);
  if (dirty.landmark) payload.landmark = emptyToNull(values.landmark);
  if (dirty.latitude || dirty.longitude) {
    payload.latitude = values.latitude;
    payload.longitude = values.longitude;
  }
  if (dirty.base_location) payload.base_location = emptyToNull(values.base_location);
  if (dirty.travel_radius_km) {
    payload.travel_radius_km =
      values.travel_radius_km === "" ? null : Number(values.travel_radius_km);
  }

  return payload;
}
