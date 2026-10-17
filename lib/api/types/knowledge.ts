/**
 * Enums shared across the business knowledge base (services, products,
 * FAQs, policies, documents). Values mirror the backend exactly.
 */

export type AgentScope = "all" | "selected";

/** Fields every agent-scoped knowledge item carries. */
export interface AgentEnablement {
  agent_scope: AgentScope;
  agent_ids: string[];
}

export const PRICE_TYPES = [
  "fixed",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "range",
  "custom_message",
] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

/** Products only support a subset of the service price types. */
export const PRODUCT_PRICE_TYPES = ["fixed", "range", "custom_message"] as const;
export type ProductPriceType = (typeof PRODUCT_PRICE_TYPES)[number];

/** Types priced by a single amount (everything except range/custom_message). */
export const UNIT_PRICE_TYPES = [
  "fixed",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;

export function isUnitPriced(type: PriceType | null | ""): boolean {
  return (UNIT_PRICE_TYPES as readonly string[]).includes(type ?? "");
}

export const DURATION_UNITS = ["hours", "days", "weeks", "months", "years"] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

export type FaqMode = "inherit" | "custom";
