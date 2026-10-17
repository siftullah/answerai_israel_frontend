import type { LocationType, SocialKey } from "./business-profile";
import type { DurationUnit, PriceType, ProductPriceType } from "./knowledge";

export type ExtractionTarget =
  | "basic_info"
  | "services"
  | "products"
  | "faqs"
  | "policies"
  | "document";

export type ExtractionSourceType = "url" | "file";

export type ExtractionStatus = "pending" | "processing" | "ready" | "failed";

/**
 * A draft-producing AI extraction run. `draft` stays null until status
 * is "ready"; its shape depends on `target` (see the *Draft types).
 * Drafts are never applied automatically — the user reviews them and
 * the frontend writes through the normal CRUD endpoints.
 */
export interface Extraction {
  id: string;
  target: ExtractionTarget;
  source_type: ExtractionSourceType;
  source_url: string | null;
  status: ExtractionStatus;
  draft: unknown;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface BasicInfoDraft {
  description?: string | null;
  categories?: string[] | null;
  public_email?: string | null;
  public_phone?: string | null;
  website?: string | null;
  year_founded?: number | null;
  socials?: Partial<Record<SocialKey, string | null>> | null;
  location_type?: LocationType | null;
  address?: string | null;
  base_location?: string | null;
  travel_radius_km?: number | null;
}

export interface ServiceDraft {
  name: string;
  description?: string | null;
  has_price?: boolean | null;
  price_type?: PriceType | null;
  price_cents?: number | null;
  price_min_cents?: number | null;
  price_max_cents?: number | null;
  price_message?: string | null;
  has_duration?: boolean | null;
  duration_unit?: DurationUnit | null;
  duration_quantity?: number | null;
}

export interface ProductDraft {
  name: string;
  description?: string | null;
  has_price?: boolean | null;
  price_type?: ProductPriceType | null;
  price_cents?: number | null;
  price_min_cents?: number | null;
  price_max_cents?: number | null;
  price_message?: string | null;
}

export interface FaqDraft {
  question: string;
  answer: string;
  category?: string | null;
}

export interface PolicyDraft {
  name: string;
  content: string;
}

export interface CreateExtractionPayload {
  target: ExtractionTarget;
  source_type: ExtractionSourceType;
  source_url?: string;
  file?: File;
}
