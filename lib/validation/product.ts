import { z } from "zod";
import {
  PRODUCT_PRICE_TYPES,
  isUnitPriced,
  type Product,
  type ProductDraft,
  type ProductPayload,
} from "@/lib/api/types";
import {
  agentScopeFields,
  faqAttachmentFields,
  pendingOwnFaqFields,
  priceFields,
  refineAgentScope,
  refinePrice,
} from "@/lib/validation/knowledge";

export const productSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(150, "Keep the name under 150 characters"),
    description: z.string().max(2000, "Keep the description under 2,000 characters"),
    available: z.boolean(),
    ...priceFields,
    // Products only support fixed / range / custom_message.
    price_type: z.union([z.literal(""), z.enum(PRODUCT_PRICE_TYPES)]),
    ...faqAttachmentFields,
    ...pendingOwnFaqFields,
    ...agentScopeFields,
  })
  .superRefine((values, ctx) => {
    refinePrice(values, ctx);
    refineAgentScope(values, ctx);
  });

export type ProductValues = z.infer<typeof productSchema>;

/** Accepts a saved Product, an extraction-draft payload, or null (create). */
export function toProductValues(source: Product | ProductPayload | null): ProductValues {
  return {
    name: source?.name ?? "",
    description: source?.description ?? "",
    available: source?.available ?? true,
    has_price: source?.has_price ?? true,
    ai_can_quote_price: source?.ai_can_quote_price ?? true,
    price_type: source?.price_type ?? "",
    price_cents: source?.price_cents ?? null,
    price_min_cents: source?.price_min_cents ?? null,
    price_max_cents: source?.price_max_cents ?? null,
    price_message: source?.price_message ?? "",
    faq_mode: source?.faq_mode ?? "inherit",
    faq_ids: source?.faq_ids ?? [],
    pending_own_faqs: [],
    agent_scope: source?.agent_scope ?? "all",
    agent_ids: source?.agent_ids ?? [],
  };
}

export function toProductPayload(values: ProductValues): ProductPayload {
  const type = values.has_price && values.price_type !== "" ? values.price_type : null;
  const description = values.description.trim();
  return {
    name: values.name.trim(),
    description: description === "" ? null : description,
    available: values.available,
    has_price: values.has_price,
    ai_can_quote_price: values.ai_can_quote_price,
    price_type: type,
    price_cents: type === "fixed" ? values.price_cents : null,
    price_min_cents: type === "range" ? values.price_min_cents : null,
    price_max_cents: type === "range" ? values.price_max_cents : null,
    price_message: type === "custom_message" ? values.price_message.trim() : null,
    faq_mode: values.faq_mode,
    faq_ids: values.faq_mode === "custom" ? values.faq_ids : [],
    agent_scope: values.agent_scope,
    agent_ids: values.agent_scope === "selected" ? values.agent_ids : [],
  };
}

/** Normalizes an extraction draft into a creatable payload. */
export function draftToProductPayload(draft: ProductDraft): ProductPayload {
  const type = draft.has_price && draft.price_type ? draft.price_type : null;
  return {
    name: draft.name,
    description: draft.description ?? null,
    available: true,
    has_price: type !== null,
    ai_can_quote_price: true,
    price_type: type,
    price_cents: type !== null && isUnitPriced(type) ? (draft.price_cents ?? null) : null,
    price_min_cents: type === "range" ? (draft.price_min_cents ?? null) : null,
    price_max_cents: type === "range" ? (draft.price_max_cents ?? null) : null,
    price_message: type === "custom_message" ? (draft.price_message ?? null) : null,
    faq_mode: "inherit",
    faq_ids: [],
    agent_scope: "all",
    agent_ids: [],
  };
}
