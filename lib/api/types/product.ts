import type { AgentScope, FaqMode, ProductPriceType } from "./knowledge";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  available: boolean;
  has_price: boolean;
  ai_can_quote_price: boolean;
  price_type: ProductPriceType | null;
  price_cents: number | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  price_message: string | null;
  faq_mode: FaqMode;
  faq_ids: string[];
  agent_scope: AgentScope;
  agent_ids: string[];
  created_at: string;
  updated_at: string;
}

/** POST/PATCH body — backend rules are sometimes|nullable throughout. */
export type ProductPayload = Partial<
  Omit<Product, "id" | "created_at" | "updated_at">
>;

export interface ProductListFilters {
  q?: string;
  available?: boolean;
}

export interface ProductImportPreview {
  token: string;
  columns: { index: number; header: string }[];
  sample_rows: string[][];
  expires_in_minutes: number;
}

/** Values are 0-based column indexes from the preview. */
export interface ProductImportMapping {
  name: number;
  description?: number;
  price_dollars?: number;
  price_min_dollars?: number;
  price_max_dollars?: number;
  price_message?: number;
}

export interface ProductImportPayload {
  token: string;
  has_header_row: boolean;
  mapping: ProductImportMapping;
}
