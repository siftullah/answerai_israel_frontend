/** Mirrors app/Http/Resources/LeadResource.php */

export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** The Open tab's status set — leads still being worked. */
export const OPEN_LEAD_STATUSES: readonly LeadStatus[] = ["new", "contacted", "qualified"];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
};

export type LeadSource = "manual" | "agent_call" | "api";

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  manual: "Added manually",
  agent_call: "From a call",
  api: "Via the API",
};

export interface LeadContactRef {
  id: string;
  /** AI-created contacts can be number-only, so the name may be missing. */
  name: string | null;
}

export interface LeadAssigneeRef {
  id: string;
  name: string;
}

export interface LeadCallRef {
  id: string;
  summary_title: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  title: string;
  status: LeadStatus;
  /** Estimated worth of the work; null = not valued yet. */
  value_cents: number | null;
  currency: string | null;
  /** Calendar date "YYYY-MM-DD"; null = no target close date. */
  expected_close_date: string | null;
  source: LeadSource;
  /** Stamped when the lead is won or lost, cleared on reopen. */
  closed_at: string | null;
  contact: LeadContactRef | null;
  assignee: LeadAssigneeRef | null;
  /** The call that captured this lead — only loaded on the detail endpoint. */
  call?: LeadCallRef | null;
  created_at: string;
  updated_at: string;
}

/** Mirrors app/Http/Resources/LeadActivityResource.php */
export type LeadActivityType = "note" | "status_change" | "call";

export interface LeadActivity {
  id: string;
  type: LeadActivityType;
  body: string | null;
  /** status_change carries {from, to}; other types vary. */
  metadata: Record<string, unknown> | null;
  /** Null = recorded by the system or the AI agent. */
  user: { id: string; name: string } | null;
  created_at: string;
}

/** Effective leads-module settings from GET modules/leads/settings. */
export interface LeadModuleSettings {
  /** Log a lead automatically after inbound calls with no open lead. */
  auto_create_lead_on_inbound: boolean;
}

export interface LeadCounts {
  open: number;
  new: number;
  contacted: number;
  qualified: number;
  won: number;
  lost: number;
  all: number;
  /** Sum of value_cents across open leads. */
  pipeline_value_cents: number;
  won_this_month_cents: number;
  /** Trailing-90-day win-rate inputs: won ÷ (won + lost). */
  won_90d: number;
  lost_90d: number;
}

/** Index filters — `status` takes a comma-joined list or the literal "open". */
export interface LeadListFilters {
  status?: string;
  contact_id?: string;
  assignee_user_id?: string;
  q?: string;
  /** Omitted = newest first. */
  sort?: "value" | "expected_close_date";
}

export interface StoreLeadPayload {
  title: string;
  contact_id: string;
  status?: LeadStatus;
  value_cents?: number;
  currency?: string;
  expected_close_date?: string;
  assignee_user_id?: string;
  /** Seeds the first note on the timeline. */
  details?: string;
}

/** Status changes ride the same PATCH; the backend journals the transition. */
export interface UpdateLeadPayload {
  title?: string;
  status?: LeadStatus;
  /** Reassignment is only allowed while the lead is open. */
  contact_id?: string;
  value_cents?: number | null;
  currency?: string | null;
  expected_close_date?: string | null;
  assignee_user_id?: string | null;
}
