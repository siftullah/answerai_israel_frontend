import type { AgentScope } from "./knowledge";

export interface BusinessPolicy {
  id: string;
  name: string;
  /** AI-generated on the backend; read-only for the frontend. */
  summary: string | null;
  content: string;
  agent_scope: AgentScope;
  agent_ids: string[];
  created_at: string;
  updated_at: string;
}

export type BusinessPolicyPayload = Partial<
  Omit<BusinessPolicy, "id" | "summary" | "created_at" | "updated_at">
>;
