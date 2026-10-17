import { z } from "zod";
import type { Faq, FaqPayload } from "@/lib/api/types";
import { agentScopeFields, refineAgentScope } from "@/lib/validation/knowledge";

export const faqSchema = z
  .object({
    question: z.string().min(1, "Question is required").max(500, "Keep the question under 500 characters"),
    answer: z.string().min(1, "Answer is required").max(5000, "Keep the answer under 5,000 characters"),
    faq_category_id: z.string(),
    ...agentScopeFields,
  })
  .superRefine((values, ctx) => refineAgentScope(values, ctx));

export type FaqValues = z.infer<typeof faqSchema>;

/** Accepts a saved Faq, an extraction-derived payload, or null (create). */
export function toFaqValues(source: Faq | FaqPayload | null): FaqValues {
  let categoryId = "";
  if (source) {
    if ("category" in source) {
      categoryId = source.category?.id ?? "";
    } else if ("faq_category_id" in source) {
      categoryId = source.faq_category_id ?? "";
    }
  }
  return {
    question: source?.question ?? "",
    answer: source?.answer ?? "",
    faq_category_id: categoryId,
    agent_scope: source?.agent_scope ?? "all",
    agent_ids: source?.agent_ids ?? [],
  };
}

/** Owned FAQs (service/product copies) have no enablement of their own. */
export const ownedFaqSchema = z.object({
  question: z.string().min(1, "Question is required").max(500, "Keep the question under 500 characters"),
  answer: z.string().min(1, "Answer is required").max(5000, "Keep the answer under 5,000 characters"),
  faq_category_id: z.string(),
});

export type OwnedFaqValues = z.infer<typeof ownedFaqSchema>;

export function toFaqPayload(values: FaqValues): FaqPayload {
  return {
    question: values.question.trim(),
    answer: values.answer.trim(),
    faq_category_id: values.faq_category_id === "" ? null : values.faq_category_id,
    agent_scope: values.agent_scope,
    agent_ids: values.agent_scope === "selected" ? values.agent_ids : [],
  };
}
