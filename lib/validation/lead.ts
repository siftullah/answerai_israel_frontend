import { z } from "zod";
import type { Lead, StoreLeadPayload, UpdateLeadPayload } from "@/lib/api/types";
import type { Translator } from "@/lib/i18n/types";
import { dollarsToCents, centsToDollarsInput } from "@/lib/money";

/**
 * Loose mirror of Store/UpdateLeadRequest. The value is edited in dollars and
 * converted to integer cents at the payload boundary; `details` only exists on
 * create (it seeds the first timeline note — edits add notes instead).
 * `t` is a translator scoped to the `validation` namespace.
 */
export function leadFormSchema(t: Translator) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, t("lead.titleRequired"))
      .max(200, t("length.title", { max: 200 })),
    contact_id: z.string().min(1, t("common.contactRequired")),
    /** Dollars input; "" = no value yet. */
    value: z
      .string()
      .refine(
        (value) => value.trim() === "" || dollarsToCents(value) !== null,
        t("lead.valueInvalid")
      ),
    /** Calendar key "YYYY-MM-DD", "" = no target close date. */
    expected_close_date: z.string(),
    /** "" = unassigned. */
    assignee_user_id: z.string(),
    details: z.string().max(5000, t("length.notes", { max: 5000 })),
  });
}

export type LeadFormValues = z.infer<ReturnType<typeof leadFormSchema>>;

export function defaultLeadValues(): LeadFormValues {
  return {
    title: "",
    contact_id: "",
    value: "",
    expected_close_date: "",
    assignee_user_id: "",
    details: "",
  };
}

export function leadToFormValues(lead: Lead): LeadFormValues {
  return {
    title: lead.title,
    contact_id: lead.contact?.id ?? "",
    value: lead.value_cents !== null ? centsToDollarsInput(lead.value_cents) : "",
    expected_close_date: lead.expected_close_date ?? "",
    assignee_user_id: lead.assignee?.id ?? "",
    details: "",
  };
}

export function toStoreLeadPayload(values: LeadFormValues): StoreLeadPayload {
  const valueCents = dollarsToCents(values.value);
  const details = values.details.trim();
  return {
    title: values.title.trim(),
    contact_id: values.contact_id,
    ...(valueCents !== null ? { value_cents: valueCents } : {}),
    ...(values.expected_close_date ? { expected_close_date: values.expected_close_date } : {}),
    ...(values.assignee_user_id ? { assignee_user_id: values.assignee_user_id } : {}),
    ...(details ? { details } : {}),
  };
}

/** PATCH counterpart — explicit nulls clear stored values. */
export function toUpdateLeadPayload(values: LeadFormValues): UpdateLeadPayload {
  return {
    title: values.title.trim(),
    contact_id: values.contact_id,
    value_cents: dollarsToCents(values.value),
    expected_close_date: values.expected_close_date || null,
    assignee_user_id: values.assignee_user_id || null,
  };
}
