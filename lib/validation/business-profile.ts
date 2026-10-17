import { z } from "zod";
import type { BusinessProfile, UpdateBusinessProfilePayload } from "@/lib/api/types";
import { SOCIAL_KEYS } from "@/lib/api/types";
import { formatE164, normalizeAuPhone, optionalAuPhoneField } from "@/lib/phone";

const CURRENT_YEAR = new Date().getFullYear();

const optionalEmail = z.union([z.literal(""), z.email("Enter a valid email address")]);
const socialUrl = z.union([
  z.literal(""),
  z.url("Enter a full URL, including https://").max(500, "Keep the URL under 500 characters"),
]);

/**
 * Form-facing schema: text inputs hold "" for unset values (the payload
 * builder converts to null), numeric inputs hold strings.
 */
export const businessProfileSchema = z.object({
  public_email: optionalEmail,
  // Loose AU shape gate; the backend's Phone rule stays the authority.
  public_phone: optionalAuPhoneField(),
  website: z.union([
    z.literal(""),
    z.url("Enter a full URL, including https://").max(2000, "Keep the URL under 2,000 characters"),
  ]),
  country: z.string(),
  currency: z.string(),
  description: z.string().max(5000, "Keep the description under 5,000 characters"),
  categories: z
    .array(z.string().min(1).max(60, "Each category must be 60 characters or fewer"))
    .max(10, "Up to 10 categories"),
  year_founded: z
    .string()
    .refine(
      (v) => v === "" || (/^\d{4}$/.test(v) && Number(v) >= 1800 && Number(v) <= CURRENT_YEAR),
      `Enter a year between 1800 and ${CURRENT_YEAR}`
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
  address: z.string().max(500, "Keep the address under 500 characters"),
  landmark: z.string().max(255, "Keep the landmark under 255 characters"),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  base_location: z.string().max(500, "Keep the base location under 500 characters"),
  travel_radius_km: z
    .string()
    .refine(
      (v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 1000),
      "Enter a distance between 1 and 1000 km"
    ),
});

export type BusinessProfileValues = z.infer<typeof businessProfileSchema>;

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
