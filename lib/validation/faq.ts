import { z } from "zod";
import type { Faq, FaqPayload } from "@/lib/api/types";
import type { Translator } from "@/lib/i18n/types";
import { agentScopeFields, refineAgentScope } from "@/lib/validation/knowledge";

/** Question/answer fields shared by both FAQ forms. */
function faqTextFields(t: Translator) {
  return {
    question: z
      .string()
      .min(1, t("faq.questionRequired"))
      .max(500, t("length.question", { max: 500 })),
    answer: z
      .string()
      .min(1, t("faq.answerRequired"))
      .max(5000, t("length.answer", { max: 5000 })),
  };
}

/** `t` is a translator scoped to the `validation` namespace. */
export function faqSchema(t: Translator) {
  return z
    .object({
      ...faqTextFields(t),
      faq_category_id: z.string(),
      ...agentScopeFields,
    })
    .superRefine((values, ctx) => refineAgentScope(t, values, ctx));
}

export type FaqValues = z.infer<ReturnType<typeof faqSchema>>;

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
export function ownedFaqSchema(t: Translator) {
  return z.object({
    ...faqTextFields(t),
    faq_category_id: z.string(),
  });
}

export type OwnedFaqValues = z.infer<ReturnType<typeof ownedFaqSchema>>;

export function toFaqPayload(values: FaqValues): FaqPayload {
  return {
    question: values.question.trim(),
    answer: values.answer.trim(),
    faq_category_id: values.faq_category_id === "" ? null : values.faq_category_id,
    agent_scope: values.agent_scope,
    agent_ids: values.agent_scope === "selected" ? values.agent_ids : [],
  };
}
