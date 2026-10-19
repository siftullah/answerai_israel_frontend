import { rt } from "@/lib/i18n/runtime";
import { labelMap } from "@/lib/i18n/label-map";

export type AgentPurpose = "inbound" | "outbound" | "consult";
export type AgentStatus = "active" | "archived";

export type AgentSyncStatus = "in_sync" | "pending" | "syncing" | "error";

/** Sync states that resolve on their own — poll while one is active. */
export const TRANSITIONAL_SYNC_STATUSES: readonly AgentSyncStatus[] = [
  "pending",
  "syncing",
];

export interface AgentDynamicVariable {
  name: string;
  default_value: string | null;
}

/**
 * Contact built-ins an agent may mark overridable: the place-call dialog then asks
 * the caller to confirm or replace them, and campaigns may supply them per recipient.
 */
export const OVERRIDABLE_BUILTIN_VARIABLES = [
  "contact_name",
  "contact_email",
  "contact_company",
  "contact_address",
] as const;
export type OverridableBuiltinVariable = (typeof OVERRIDABLE_BUILTIN_VARIABLES)[number];

export const OVERRIDABLE_BUILTIN_LABELS: Record<OverridableBuiltinVariable, string> = labelMap(
  "lib.overridableBuiltin",
  ["contact_name", "contact_email", "contact_company", "contact_address"]
);

/** Sparse per-agent calendar mechanics; absent key = inherit the business/member tier. */
export interface AgentCalendarOverrides {
  slot_interval_minutes?: number;
  min_notice_minutes?: number;
  max_horizon_days?: number;
  buffer_minutes?: number;
  /** null = explicitly uncapped (distinct from inherit). */
  max_bookings_per_day?: number | null;
  appointment_duration_minutes?: number;
  callback_duration_minutes?: number;
}

export interface AgentConfig {
  v: number;
  voice_id: string | null;
  first_message: string;
  prompt_text: string;
  rag_enabled?: boolean;
  action_tools: string[];
  dynamic_variables?: AgentDynamicVariable[];
  /** Built-ins the caller confirms or overrides per call; see OVERRIDABLE_BUILTIN_VARIABLES. */
  overridable_builtins?: string[];
  calendar_overrides?: AgentCalendarOverrides;
}

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  status: AgentStatus;
  /** "consult" agents are platform-managed and never selectable. */
  purpose: AgentPurpose;
  sync_status: AgentSyncStatus;
  sync_error: string | null;
  /** Provisioned to the voice engine at least once (test calls need this). */
  has_been_published: boolean;
  config?: AgentConfig | null;
  created_at: string;
  updated_at: string;
}

/** `label`/`description` are getters so they read in the active UI language. */
export const AGENT_TEMPLATES = [
  {
    value: "blank",
    get label() {
      return rt("lib.agentTemplates.blank.label");
    },
    get description() {
      return rt("lib.agentTemplates.blank.description");
    },
    purpose: "inbound",
  },
  {
    value: "receptionist",
    get label() {
      return rt("lib.agentTemplates.receptionist.label");
    },
    get description() {
      return rt("lib.agentTemplates.receptionist.description");
    },
    purpose: "inbound",
  },
  {
    value: "appointment_setter",
    get label() {
      return rt("lib.agentTemplates.appointment_setter.label");
    },
    get description() {
      return rt("lib.agentTemplates.appointment_setter.description");
    },
    purpose: "inbound",
  },
  {
    value: "after_hours",
    get label() {
      return rt("lib.agentTemplates.after_hours.label");
    },
    get description() {
      return rt("lib.agentTemplates.after_hours.description");
    },
    purpose: "inbound",
  },
  {
    value: "outbound_caller",
    get label() {
      return rt("lib.agentTemplates.outbound_caller.label");
    },
    get description() {
      return rt("lib.agentTemplates.outbound_caller.description");
    },
    purpose: "outbound",
  },
  {
    value: "lead_qualifier",
    get label() {
      return rt("lib.agentTemplates.lead_qualifier.label");
    },
    get description() {
      return rt("lib.agentTemplates.lead_qualifier.description");
    },
    purpose: "outbound",
  },
] as const;

export type AgentTemplate = (typeof AGENT_TEMPLATES)[number]["value"];

export interface CreateAgentPayload {
  name: string;
  purpose?: "inbound" | "outbound";
  template?: Exclude<AgentTemplate, "blank">;
}

export interface UpdateAgentPayload {
  name?: string;
  description?: string | null;
  purpose?: "inbound" | "outbound";
  config?: {
    /** Omit while unset — the backend rejects an explicit null. */
    voice_id?: string;
    first_message?: string;
    prompt_text?: string;
    rag_enabled?: boolean;
    action_tools?: string[];
    dynamic_variables?: AgentDynamicVariable[];
    overridable_builtins?: string[];
    calendar_overrides?: AgentCalendarOverrides;
  };
}

/** Non-blocking advisory returned alongside a successful save. */
export interface AgentConfigWarning {
  field: string;
  issue: string;
}

export interface UpdateAgentResult {
  agent: Agent;
  warnings: AgentConfigWarning[];
}

export interface AgentTestCallTurn {
  role: string;
  message: string;
  time_in_call_secs: number | null;
  tool_calls: string[];
}
