import { z } from "zod";
import { DURATION_UNITS, PRICE_TYPES, isUnitPriced } from "@/lib/api/types";

/**
 * Reusable zod fragments for knowledge items (services, products, and in
 * later phases FAQs/policies/docs). Schemas spread the field maps and call
 * the matching refine* helper from superRefine — the refiners mirror the
 * backend's cross-field rules exactly.
 */

export const agentScopeFields = {
  agent_scope: z.enum(["all", "selected"]),
  agent_ids: z.array(z.string()),
};

export function refineAgentScope(
  values: { agent_scope: "all" | "selected"; agent_ids: string[] },
  ctx: z.RefinementCtx
): void {
  if (values.agent_scope === "selected" && values.agent_ids.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["agent_ids"],
      message: "Choose at least one agent",
    });
  }
}

export const priceFields = {
  has_price: z.boolean(),
  ai_can_quote_price: z.boolean(),
  price_type: z.union([z.literal(""), z.enum(PRICE_TYPES)]),
  price_cents: z.number().int().min(0).nullable(),
  price_min_cents: z.number().int().min(0).nullable(),
  price_max_cents: z.number().int().min(0).nullable(),
  price_message: z.string().max(500, "Keep the message under 500 characters"),
};

export interface PriceValues {
  has_price: boolean;
  price_type: "" | (typeof PRICE_TYPES)[number];
  price_cents: number | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  price_message: string;
}

export function refinePrice(values: PriceValues, ctx: z.RefinementCtx): void {
  if (!values.has_price) return;

  if (values.price_type === "") {
    ctx.addIssue({
      code: "custom",
      path: ["price_type"],
      message: "Choose how this is priced",
    });
    return;
  }

  if (isUnitPriced(values.price_type) && values.price_cents === null) {
    ctx.addIssue({ code: "custom", path: ["price_cents"], message: "Enter a price" });
  }

  if (values.price_type === "range") {
    if (values.price_min_cents === null) {
      ctx.addIssue({ code: "custom", path: ["price_min_cents"], message: "Enter a minimum" });
    }
    if (values.price_max_cents === null) {
      ctx.addIssue({ code: "custom", path: ["price_max_cents"], message: "Enter a maximum" });
    }
    if (
      values.price_min_cents !== null &&
      values.price_max_cents !== null &&
      values.price_min_cents > values.price_max_cents
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["price_max_cents"],
        message: "Must be at least the minimum",
      });
    }
  }

  if (values.price_type === "custom_message" && values.price_message.trim() === "") {
    ctx.addIssue({
      code: "custom",
      path: ["price_message"],
      message: "Enter what to say instead of a price",
    });
  }
}

export const faqAttachmentFields = {
  faq_mode: z.enum(["inherit", "custom"]),
  faq_ids: z.array(z.string()),
};

/** Own FAQs composed while CREATING a service/product — they can't exist
 * server-side until the owner does, so they ride along in form state and
 * are POSTed (with the owner id) after the parent is created. */
export const pendingOwnFaqFields = {
  pending_own_faqs: z.array(
    z.object({
      question: z.string().min(1).max(500, "Keep the question under 500 characters"),
      answer: z.string().min(1).max(5000, "Keep the answer under 5,000 characters"),
    })
  ),
};

export interface PendingOwnFaq {
  question: string;
  answer: string;
}

export const durationFields = {
  has_duration: z.boolean(),
  duration_unit: z.union([z.literal(""), z.enum(DURATION_UNITS)]),
  // String field, converted in the payload builder (matches the
  // year_founded/travel_radius_km convention in business-profile.ts).
  duration_quantity: z.string(),
};

export function refineDuration(
  values: { has_duration: boolean; duration_unit: string; duration_quantity: string },
  ctx: z.RefinementCtx
): void {
  if (!values.has_duration) return;
  if (values.duration_unit === "") {
    ctx.addIssue({ code: "custom", path: ["duration_unit"], message: "Choose a unit" });
  }
  const quantity = Number(values.duration_quantity);
  if (
    values.duration_quantity.trim() === "" ||
    Number.isNaN(quantity) ||
    quantity < 0.25 ||
    quantity > 9999
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["duration_quantity"],
      message: "Enter a duration between 0.25 and 9999",
    });
  }
}
