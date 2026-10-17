export const CALL_STATUSES = [
  "queued",
  "initiating",
  "ringing",
  "in_progress",
  "completed",
  "busy",
  "no_answer",
  "failed",
  "canceled",
] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

/** Pre-terminal statuses the outbound list keeps polling for (outbound-only:
 * inbound rows are created post-call and land terminal). */
export const TRANSITIONAL_CALL_STATUSES: readonly CallStatus[] = [
  "queued",
  "initiating",
  "ringing",
  "in_progress",
];

/** Statuses an outbound call can still be cancelled in (pre-connect). */
export const CANCELABLE_CALL_STATUSES: readonly CallStatus[] = [
  "queued",
  "initiating",
  "ringing",
];

export type CallDirection = "inbound" | "outbound";

export type CallOutcome = "success" | "failure" | "unknown";

export type RecordingStatus =
  | "disabled"
  | "pending"
  | "processing"
  | "available"
  | "failed"
  | "deleted";

export type TransferState =
  | "consult_pending"
  | "accepted"
  | "bridged"
  | "declined"
  | "unavailable"
  | "cancelled";

export type TransferNextAction =
  | "take_callback_message"
  | "ask_to_call_back_later"
  | "redirect"
  | "none";

export interface CallRef {
  id: string;
  name: string;
}

/** Contact block only — the backend keeps it withTrashed, so past call logs
 * retain the name after the contact is deleted. */
export interface CallContactRef {
  id: string;
  name: string;
  deleted: boolean;
}

/**
 * Two shapes from the backend's transferBlock(): warm transfers carry
 * `status`/consult fields, blind transfers carry only `recording`.
 * Branch on `status` presence.
 */
export interface CallTransfer {
  /** Null on a consult leg's own block — those columns live on the primary call. */
  at: string | null;
  to_e164: string | null;
  type: "blind" | "warm" | null;
  status?: TransferState;
  responder_name?: string | null;
  relay_message?: string | null;
  next_action?: TransferNextAction | null;
  action_detail?: string | null;
  consult_call_id?: string | null;
  conference_recording?: boolean;
  recording?: boolean;
}

export interface Call {
  id: string;
  direction: CallDirection;
  status: CallStatus;
  from_e164: string;
  to_e164: string;
  caller_name: string | null;
  caller_email: string | null;
  agent: CallRef | null;
  phone_number: { id: string; e164: string } | null;
  contact: CallContactRef | null;
  campaign: CallRef | null;
  callback: { id: string; type: string } | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  end_reason: string | null;
  transfer: CallTransfer | null;
  call_successful: CallOutcome | null;
  summary_title: string | null;
  summary: string | null;
  recording_status: RecordingStatus;
  recording_duration_seconds: number | null;
  notes: string | null;
  created_at: string;
}

export interface TranscriptSegment {
  role: "user" | "agent";
  text: string;
  t0_secs: number | null;
  tool_call?: { names: string[] };
}

export interface CallTranscript {
  segments: TranscriptSegment[];
  full_text: string;
  language: string | null;
}

export interface CallExtraction {
  data: Record<string, unknown>;
  evaluation: Record<string, unknown> | null;
}

/** Slim mirrors of the backend resources — only what the related card renders. */
export interface RelatedAppointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
}

export interface RelatedLead {
  id: string;
  title: string;
  status: string;
  value_cents: number | null;
  currency: string | null;
}

export interface RelatedJob {
  id: string;
  reference: string;
  title: string;
  status: string;
}

export interface RelatedInvoice {
  id: string;
  number: string;
  status: string;
  total_cents: number;
  currency: string;
}

export interface RelatedCallback {
  id: string;
  type: string;
  status: string;
  scheduled_at: string;
  outcome: string | null;
}

/** Keys are absent entirely when that module is disabled for the business. */
export interface CallRelated {
  appointments?: RelatedAppointment[];
  leads?: RelatedLead[];
  jobs?: RelatedJob[];
  invoices?: RelatedInvoice[];
  callbacks?: { originated: RelatedCallback[]; resulted: RelatedCallback[] };
}

/** Index filters — all optional. The log pages always pass direction (their
 * page preset); the contact activity panel omits it to get both directions. */
export interface CallListFilters {
  direction?: CallDirection;
  sort?: "newest" | "oldest";
  q?: string;
  status?: CallStatus;
  call_successful?: CallOutcome;
  agent_id?: string;
  phone_number_id?: string;
  contact_id?: string;
  campaign_id?: string;
  has_recording?: boolean;
  created_after?: string;
  created_before?: string;
}

export interface PlaceCallPayload {
  agent_id: string;
  from_phone_number_id: string;
  to_number: string;
  contact_id?: string;
  /** A value for every variable the agent declares — the backend rejects a missing one. */
  dynamic_variables?: Record<string, string>;
}
