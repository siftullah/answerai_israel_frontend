import { z } from "zod";
import type { Translator } from "@/lib/i18n/types";
import { agentScopeFields, refineAgentScope } from "@/lib/validation/knowledge";

export const MAX_DOCUMENT_TEXT = 204800;

/**
 * Create-document form. The picked File lives in component state and is
 * checked imperatively in the submit handler (source_type "file").
 * Schema factories take a translator scoped to the `validation` namespace.
 */
export function documentCreateSchema(t: Translator) {
  return z
    .object({
      source_type: z.enum(["file", "url", "text"]),
      name: z.string().min(1, t("common.nameRequired")).max(200, t("length.name", { max: 200 })),
      description: z.string().max(2000, t("length.description", { max: 2000 })),
      source_url: z.string(),
      text: z.string().max(MAX_DOCUMENT_TEXT, t("document.textTooLong")),
      ...agentScopeFields,
    })
    .superRefine((values, ctx) => {
      refineAgentScope(t, values, ctx);
      if (values.source_type === "url" && !/^https?:\/\/.+/.test(values.source_url.trim())) {
        ctx.addIssue({
          code: "custom",
          path: ["source_url"],
          message: t("common.urlInvalid"),
        });
      }
      if (values.source_type === "text" && values.text.trim() === "") {
        ctx.addIssue({ code: "custom", path: ["text"], message: t("document.textRequired") });
      }
    });
}

export type DocumentCreateValues = z.infer<ReturnType<typeof documentCreateSchema>>;

function editFields(t: Translator) {
  return {
    name: z.string().min(1, t("common.nameRequired")).max(200, t("length.name", { max: 200 })),
    description: z.string().max(2000, t("length.description", { max: 2000 })),
    ...agentScopeFields,
  };
}

export function documentEditSchema(t: Translator) {
  return z
    .object(editFields(t))
    .superRefine((values, ctx) => refineAgentScope(t, values, ctx));
}

export type DocumentEditValues = z.infer<ReturnType<typeof documentEditSchema>>;

/** Edit form for docs with editable content (pasted text, extracted URLs). */
export function documentContentEditSchema(t: Translator) {
  return z
    .object({
      ...editFields(t),
      body: z
        .string()
        .min(1, t("document.contentRequired"))
        .max(MAX_DOCUMENT_TEXT, t("document.textTooLong")),
    })
    .superRefine((values, ctx) => refineAgentScope(t, values, ctx));
}

export type DocumentContentEditValues = z.infer<ReturnType<typeof documentContentEditSchema>>;
