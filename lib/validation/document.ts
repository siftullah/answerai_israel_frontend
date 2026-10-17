import { z } from "zod";
import { agentScopeFields, refineAgentScope } from "@/lib/validation/knowledge";

export const MAX_DOCUMENT_TEXT = 204800;

/**
 * Create-document form. The picked File lives in component state and is
 * checked imperatively in the submit handler (source_type "file").
 */
export const documentCreateSchema = z
  .object({
    source_type: z.enum(["file", "url", "text"]),
    name: z.string().min(1, "Name is required").max(200, "Keep the name under 200 characters"),
    description: z.string().max(2000, "Keep the description under 2,000 characters"),
    source_url: z.string(),
    text: z.string().max(MAX_DOCUMENT_TEXT, "That text is too long"),
    ...agentScopeFields,
  })
  .superRefine((values, ctx) => {
    refineAgentScope(values, ctx);
    if (values.source_type === "url" && !/^https?:\/\/.+/.test(values.source_url.trim())) {
      ctx.addIssue({
        code: "custom",
        path: ["source_url"],
        message: "Enter a full URL, including https://",
      });
    }
    if (values.source_type === "text" && values.text.trim() === "") {
      ctx.addIssue({ code: "custom", path: ["text"], message: "Paste the document text" });
    }
  });

export type DocumentCreateValues = z.infer<typeof documentCreateSchema>;

const editFields = {
  name: z.string().min(1, "Name is required").max(200, "Keep the name under 200 characters"),
  description: z.string().max(2000, "Keep the description under 2,000 characters"),
  ...agentScopeFields,
};

export const documentEditSchema = z
  .object(editFields)
  .superRefine((values, ctx) => refineAgentScope(values, ctx));

export type DocumentEditValues = z.infer<typeof documentEditSchema>;

/** Edit form for docs with editable content (pasted text, extracted URLs). */
export const documentContentEditSchema = z
  .object({
    ...editFields,
    body: z
      .string()
      .min(1, "The document needs some content")
      .max(MAX_DOCUMENT_TEXT, "That text is too long"),
  })
  .superRefine((values, ctx) => refineAgentScope(values, ctx));

export type DocumentContentEditValues = z.infer<typeof documentContentEditSchema>;
