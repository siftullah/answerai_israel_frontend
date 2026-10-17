import type { AgentScope, DurationUnit, FaqMode, PriceType } from "./knowledge";

export interface Service {
  id: string;
  name: string;
  description: string | null;
  available: boolean;
  has_price: boolean;
  ai_can_quote_price: boolean;
  price_type: PriceType | null;
  price_cents: number | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  price_message: string | null;
  has_duration: boolean;
  duration_unit: DurationUnit | null;
  duration_quantity: number | null;
  faq_mode: FaqMode;
  faq_ids: string[];
  agent_scope: AgentScope;
  agent_ids: string[];
  created_at: string;
  updated_at: string;
}

/** POST/PATCH body — backend rules are sometimes|nullable throughout. */
export type ServicePayload = Partial<
  Omit<Service, "id" | "created_at" | "updated_at">
>;

export interface ServiceListFilters {
  q?: string;
  available?: boolean;
}
