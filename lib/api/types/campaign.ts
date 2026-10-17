/** Mirrors app/Http/Resources/CampaignResource.php and CampaignRecipientResource.php */

import type { ContactListFilters } from "./contact";
import type { BusinessHourRow, BusinessHourRowApiPayload } from "./transfer-target";

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "running",
  "paused",
  "completed",
  "canceled",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** The pacer is actively working these — poll while any are on screen. */
export const TRANSITIONAL_CAMPAIGN_STATUSES: readonly CampaignStatus[] = [
  "scheduled",
  "running",
];

/** Terminal campaigns reject edits and new recipients (422 campaign_locked). */
export const TERMINAL_CAMPAIGN_STATUSES: readonly CampaignStatus[] = [
  "completed",
  "canceled",
];

export const CAMPAIGN_RECIPIENT_STATUSES = [
  "pending",
  "queued",
  "calling",
  "completed",
  "retry_scheduled",
  "failed",
  "max_attempts",
  "dnc_blocked",
  "invalid",
  "skipped",
  "canceled",
] as const;
export type CampaignRecipientStatus = (typeof CAMPAIGN_RECIPIENT_STATUSES)[number];

/** The only statuses the retry endpoints accept. */
export const RETRYABLE_RECIPIENT_STATUSES: readonly CampaignRecipientStatus[] = [
  "failed",
  "max_attempts",
  "skipped",
];

export const CAMPAIGN_RETRY_REASONS = ["no_answer", "busy", "failed"] as const;
export type CampaignRetryReason = (typeof CAMPAIGN_RETRY_REASONS)[number];

/** Auto-injected per call — the backend rejects them as user-supplied variables. */
export const CAMPAIGN_BUILTIN_VARIABLES: readonly string[] = [
  "business_name",
  "agent_name",
  "contact_name",
  "contact_email",
  "contact_company",
  "contact_address",
  "caller_number",
  "now_local",
];

/** Denormalized recipient funnel, recomputed by the pacer every tick. */
export interface CampaignStats {
  total: number;
  minutes_used: number;
  last_tick_at: string | null;
  pending: number;
  queued: number;
  calling: number;
  completed: number;
  retry_scheduled: number;
  failed: number;
  max_attempts: number;
  dnc_blocked: number;
  invalid: number;
  /** Parked by the pacer: a declared variable had no value on the row or the campaign. */
  skipped: number;
  canceled: number;
}

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  /** whenLoaded — present on index, show and lifecycle responses. */
  agent?: { id: string; name: string } | null;
  caller_number?: { id: string; e164: string } | null;
  /** whenLoaded — ONLY on show/store/update/duplicate, never index or lifecycle.
   * Empty array = no custom week, the campaign inherits trading hours. */
  calling_hours?: BusinessHourRow[];
  start_at: string | null;
  end_at: string | null;
  max_concurrent: number;
  max_attempts: number;
  retry_delay_minutes: number;
  retry_on: CampaignRetryReason[];
  default_variables: Record<string, string>;
  stats: CampaignStats;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  to_e164: string;
  status: CampaignRecipientStatus;
  attempts: number;
  next_attempt_at: string | null;
  last_outcome: string | null;
  error: string | null;
  variables: Record<string, string> | null;
  contact?: { id: string; name: string | null } | null;
  created_at: string;
}

export interface CampaignListFilters {
  status?: CampaignStatus;
  q?: string;
  sort?: "newest" | "oldest";
}

export interface RecipientListFilters {
  status?: CampaignRecipientStatus;
  q?: string;
}

export interface CreateCampaignPayload {
  name: string;
  agent_id: string;
  caller_phone_number_id: string;
  start_at?: string | null;
  end_at?: string | null;
  max_concurrent?: number;
  max_attempts?: number;
  retry_delay_minutes?: number;
  retry_on?: CampaignRetryReason[];
  default_variables?: Record<string, string>;
  calling_hours?: BusinessHourRowApiPayload[];
}

/** PATCH — all optional; `calling_hours: null` clears back to trading hours,
 * omitting the key leaves the saved week untouched. */
export interface UpdateCampaignPayload
  extends Partial<Omit<CreateCampaignPayload, "calling_hours">> {
  calling_hours?: BusinessHourRowApiPayload[] | null;
}

/** Phone format is deliberately loose — unparseable rows come back as
 * `invalid` recipients instead of failing the batch. Max 5000 per request. */
export interface AddRecipientsPayload {
  recipients: {
    phone: string;
    name?: string;
    variables?: Record<string, string>;
  }[];
}

export interface RecipientsSummary {
  inserted: number;
  invalid: number;
  dnc_blocked: number;
  duplicates: number;
}

export interface FromContactsSummary extends RecipientsSummary {
  skipped_no_phone: number;
}

/** Exactly one of ids/filters. Empty filters {} legitimately targets every
 * contact — mirrors the contacts bulk endpoint. Ids are capped at 1000. */
export type FromContactsPayload =
  | { ids: string[] }
  | { filters: Pick<ContactListFilters, "q" | "tag" | "source" | "has_name"> };

export interface CampaignImportPreview {
  token: string;
  columns: { index: number; header: string }[];
  sample_rows: string[][];
  expires_in_minutes: number;
}

/** Values are 0-based column indexes from the preview. `variables` maps an
 * agent-declared variable name to the column that fills it per recipient. */
export interface CampaignImportPayload {
  token: string;
  has_header_row: boolean;
  mapping: {
    phone: number;
    name?: number;
    variables?: Record<string, number>;
  };
}

/** Exactly one of ids/statuses; statuses may only name retryable ones. */
export type RecipientBulkRetryPayload =
  | { ids: string[] }
  | { statuses: ("failed" | "max_attempts" | "skipped")[] };

export interface RecipientBulkRetryResult {
  affected: number;
}

/** Exactly one of ids/statuses. Rows mid-call are skipped, not rejected. */
export type RecipientBulkDeletePayload =
  | { ids: string[] }
  | { statuses: CampaignRecipientStatus[] };

export interface RecipientBulkDeleteResult {
  affected: number;
  skipped_calling: number;
}
