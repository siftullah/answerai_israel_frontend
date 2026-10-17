/** Mirrors app/Http/Resources/CallbackResource.php */

export const CALLBACK_STATUSES = [
  "scheduled",
  "queued",
  "in_progress",
  "completed",
  "no_answer",
  "failed",
  "canceled",
] as const;
export type CallbackStatus = (typeof CALLBACK_STATUSES)[number];

/** The Open tab's status set — everything that still needs to happen. */
export const OPEN_CALLBACK_STATUSES: readonly CallbackStatus[] = [
  "scheduled",
  "queued",
  "in_progress",
];

/** The History tab's status set — terminal, locked server-side. */
export const TERMINAL_CALLBACK_STATUSES: readonly CallbackStatus[] = [
  "completed",
  "no_answer",
  "failed",
  "canceled",
];

/** Statuses the list keeps polling for — the dispatcher is mid-flight. */
export const ACTIVE_CALLBACK_STATUSES: readonly CallbackStatus[] = ["queued", "in_progress"];

export const CALLBACK_STATUS_LABELS: Record<CallbackStatus, string> = {
  scheduled: "Scheduled",
  queued: "Calling",
  in_progress: "In progress",
  completed: "Completed",
  no_answer: "No answer",
  failed: "Failed",
  canceled: "Canceled",
};

export const CALLBACK_TYPES = ["agent", "team_member"] as const;
export type CallbackType = (typeof CALLBACK_TYPES)[number];

export const CALLBACK_TYPE_LABELS: Record<CallbackType, string> = {
  agent: "AI agent",
  team_member: "Team member",
};

export const CALLBACK_SOURCES = ["manual", "agent_call", "api"] as const;
export type CallbackSource = (typeof CALLBACK_SOURCES)[number];

export const CALLBACK_SOURCE_LABELS: Record<CallbackSource, string> = {
  manual: "Manual",
  agent_call: "Agent call",
  api: "API",
};

export const CALLBACK_OUTCOMES = ["reached", "voicemail", "no_answer", "handled"] as const;
export type CallbackOutcome = (typeof CALLBACK_OUTCOMES)[number];

export const CALLBACK_OUTCOME_LABELS: Record<CallbackOutcome, string> = {
  reached: "Reached",
  voicemail: "Left voicemail",
  no_answer: "No answer",
  handled: "Handled",
};

export interface CallbackRef {
  id: string;
  name: string;
}

export interface Callback {
  id: string;
  type: CallbackType;
  status: CallbackStatus;
  contact: CallbackRef | null;
  to_e164: string;
  /** UTC instant; render through lib/datetime with business.timezone. */
  scheduled_at: string;
  /** The zone the time was requested in — display hint only. */
  timezone: string;
  topic: string | null;
  notes: string | null;
  source: CallbackSource;
  agent: CallbackRef | null;
  assignee: CallbackRef | null;
  caller_phone_number: { id: string; e164: string; friendly_name: string | null } | null;
  /** The call this callback was promised on (agent tool), as a call uuid. */
  origin_call_id: string | null;
  /** The outbound call that fulfilled (or last attempted) it. */
  result_call_id: string | null;
  attempts: number;
  max_attempts: number;
  retry_delay_minutes: number;
  next_attempt_at: string | null;
  outcome: CallbackOutcome | null;
  overdue: boolean;
  reminder_sent_at: string | null;
  created_by: CallbackRef | null;
  completed_by: CallbackRef | null;
  completed_at: string | null;
  created_at: string;
}

export interface CallbackCounts {
  open: number;
  due_today: number;
  overdue: number;
}

/** Index filters — `status` takes a comma-joined list (backend whereIn). */
export interface CallbackListFilters {
  type?: CallbackType;
  status?: string;
  source?: CallbackSource;
  agent_id?: string;
  contact_id?: string;
  assignee_user_id?: string;
  overdue?: boolean;
  scheduled_after?: string;
  scheduled_before?: string;
  q?: string;
  sort?: "newest";
}

export interface StoreCallbackPayload {
  type: CallbackType;
  contact_id: string;
  /** UTC ISO instant. */
  scheduled_at: string;
  /** IANA zone the time was picked in (stored for display). */
  timezone: string;
  topic?: string;
  notes?: string;
  agent_id?: string;
  caller_phone_number_id?: string;
  /** User uuid (member.user.id), not the business-member uuid. */
  assignee_user_id?: string;
  max_attempts?: number;
  retry_delay_minutes?: number;
}

export interface UpdateCallbackPayload {
  assignee_user_id?: string;
  agent_id?: string;
  topic?: string | null;
  notes?: string | null;
}

export interface CompleteCallbackPayload {
  outcome?: CallbackOutcome;
  notes?: string;
  linked_call_id?: string;
}
