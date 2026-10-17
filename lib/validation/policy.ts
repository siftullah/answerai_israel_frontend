import { z } from "zod";
import type { BusinessPolicy, BusinessPolicyPayload } from "@/lib/api/types";
import { agentScopeFields, refineAgentScope } from "@/lib/validation/knowledge";

export const policySchema = z
  .object({
    name: z.string().min(1, "Name is required").max(150, "Keep the name under 150 characters"),
    content: z.string().min(1, "Content is required").max(10000, "Keep the content under 10,000 characters"),
    ...agentScopeFields,
  })
  .superRefine((values, ctx) => refineAgentScope(values, ctx));

export type PolicyValues = z.infer<typeof policySchema>;

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
