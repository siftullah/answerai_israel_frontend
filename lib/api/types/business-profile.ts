export const SOCIAL_KEYS = [
  "facebook",
  "instagram",
  "linkedin",
  "tiktok",
  "youtube",
  "x",
] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

export type LocationType = "fixed" | "mobile" | "online";

/**
 * Language the business talks to its customers in — customer-facing emails
 * (appointment confirmations, quotes, invoices) and the lines callers hear —
 * independent of each staff member's portal language. Mirrors the backend
 * contract: BusinessProfileResource.customer_locale, PATCH owner/admin only.
 */
export const CUSTOMER_LOCALES = ["he", "en", "ar", "ru"] as const;
export type CustomerLocale = (typeof CUSTOMER_LOCALES)[number];

/** What the API assumes — and the form shows — while the field is unset. */
export const DEFAULT_CUSTOMER_LOCALE: CustomerLocale = "he";

export interface BusinessLogo {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  url: string;
  created_at: string;
}

/** Singleton per business — GET/PATCH business-profile. */
export interface BusinessProfile {
  id: string;
  public_email: string | null;
  public_phone: string | null;
  website: string | null;
  country: string | null;
  currency: string | null;
  /** Basis points — 1800 = 18% VAT. Shared default for invoices and quotes. */
  tax_rate_bp: number;
  tax_label: string;
  description: string | null;
  categories: string[] | null;
  year_founded: number | null;
  socials: Partial<Record<SocialKey, string | null>> | null;
  location_type: LocationType | null;
  address: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  base_location: string | null;
  travel_radius_km: number | null;
  /** Absent until the API ships it; read as "he" (DEFAULT_CUSTOMER_LOCALE). */
  customer_locale?: CustomerLocale;
  logo: BusinessLogo | null;
  created_at: string;
  updated_at: string;
}

/** PATCH body — every field optional; only dirty fields are sent. */
export type UpdateBusinessProfilePayload = Partial<
  Omit<BusinessProfile, "id" | "logo" | "created_at" | "updated_at">
>;

export interface AddressSearchResult {
  address: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
}
