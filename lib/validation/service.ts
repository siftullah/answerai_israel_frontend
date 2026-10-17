import { z } from "zod";
import {
  isUnitPriced,
  type Service,
  type ServiceDraft,
  type ServicePayload,
} from "@/lib/api/types";
import {
  agentScopeFields,
  durationFields,
  faqAttachmentFields,
  pendingOwnFaqFields,
  priceFields,
  refineAgentScope,
  refineDuration,
  refinePrice,
} from "@/lib/validation/knowledge";

export const serviceSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(120, "Keep the name under 120 characters"),
    description: z.string().max(2000, "Keep the description under 2,000 characters"),
    available: z.boolean(),
    ...priceFields,
    ...durationFields,
    ...faqAttachmentFields,
    ...pendingOwnFaqFields,
    ...agentScopeFields,
  })
  .superRefine((values, ctx) => {
    refinePrice(values, ctx);
    refineDuration(values, ctx);
    refineAgentScope(values, ctx);
  });

export type ServiceValues = z.infer<typeof serviceSchema>;

/** Accepts a saved Service, an extraction-draft payload, or null (create). */
export function toServiceValues(source: Service | ServicePayload | null): ServiceValues {
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
    has_duration: source?.has_duration ?? true,
    duration_unit: source?.duration_unit ?? "",
    duration_quantity: source?.duration_quantity?.toString() ?? "",
    faq_mode: source?.faq_mode ?? "inherit",
    faq_ids: source?.faq_ids ?? [],
    pending_own_faqs: [],
    agent_scope: source?.agent_scope ?? "all",
    agent_ids: source?.agent_ids ?? [],
  };
}

/** Full body — backend rules are sometimes|nullable, and sending the
 * cleared shape for off-toggles keeps stale price/duration rows tidy. */
export function toServicePayload(values: ServiceValues): ServicePayload {
  const type = values.has_price && values.price_type !== "" ? values.price_type : null;
  const description = values.description.trim();
  return {
    name: values.name.trim(),
    description: description === "" ? null : description,
    available: values.available,
    has_price: values.has_price,
    ai_can_quote_price: values.ai_can_quote_price,
    price_type: type,
    price_cents: type !== null && isUnitPriced(type) ? values.price_cents : null,
    price_min_cents: type === "range" ? values.price_min_cents : null,
    price_max_cents: type === "range" ? values.price_max_cents : null,
    price_message: type === "custom_message" ? values.price_message.trim() : null,
    has_duration: values.has_duration,
    duration_unit:
      values.has_duration && values.duration_unit !== "" ? values.duration_unit : null,
    duration_quantity:
      values.has_duration && values.duration_quantity.trim() !== ""
        ? Number(values.duration_quantity)
        : null,
    faq_mode: values.faq_mode,
    faq_ids: values.faq_mode === "custom" ? values.faq_ids : [],
    agent_scope: values.agent_scope,
    agent_ids: values.agent_scope === "selected" ? values.agent_ids : [],
  };
}

/** Normalizes an extraction draft into a creatable payload (inconsistent
 * price/duration combos are demoted rather than left to 422). */
export function draftToServicePayload(draft: ServiceDraft): ServicePayload {
  const type = draft.has_price && draft.price_type ? draft.price_type : null;
  const hasDuration = Boolean(
    draft.has_duration && draft.duration_unit && draft.duration_quantity
  );
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
    has_duration: hasDuration,
    duration_unit: hasDuration ? (draft.duration_unit ?? null) : null,
    duration_quantity: hasDuration ? (draft.duration_quantity ?? null) : null,
    faq_mode: "inherit",
    faq_ids: [],
    agent_scope: "all",
    agent_ids: [],
  };
}
