import { z } from "zod";
import type { BusinessPolicy, BusinessPolicyPayload } from "@/lib/api/types";
import type { Translator } from "@/lib/i18n/types";
import { agentScopeFields, refineAgentScope } from "@/lib/validation/knowledge";

/** `t` is a translator scoped to the `validation` namespace. */
export function policySchema(t: Translator) {
  return z
    .object({
      name: z.string().min(1, t("common.nameRequired")).max(150, t("length.name", { max: 150 })),
      content: z
        .string()
        .min(1, t("policy.contentRequired"))
        .max(10000, t("length.content", { max: 10000 })),
      ...agentScopeFields,
    })
    .superRefine((values, ctx) => refineAgentScope(t, values, ctx));
}

export type PolicyValues = z.infer<ReturnType<typeof policySchema>>;

export function toPolicyValues(source: BusinessPolicy | BusinessPolicyPayload | null): PolicyValues {
  return {
    name: source?.name ?? "",
    content: source?.content ?? "",
    agent_scope: source?.agent_scope ?? "all",
    agent_ids: source?.agent_ids ?? [],
  };
}

export function toPolicyPayload(values: PolicyValues): BusinessPolicyPayload {
  return {
    name: values.name.trim(),
    content: values.content.trim(),
    agent_scope: values.agent_scope,
    agent_ids: values.agent_scope === "selected" ? values.agent_ids : [],
  };
}
