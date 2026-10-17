/** Mirrors app/Http/Resources/BusinessJobResource.php (the API speaks "jobs"). */

import type { LineItemKind } from "./invoice";

export const JOB_STATUSES = [
  "open",
  "scheduled",
  "in_progress",
  "completed",
  "canceled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** The Active tab's status set — jobs not yet closed. */
export const ACTIVE_JOB_STATUSES: readonly JobStatus[] = ["open", "scheduled", "in_progress"];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  open: "Open",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
};

export const JOB_PRIORITIES = ["low", "normal", "high"] as const;
export type JobPriority = (typeof JOB_PRIORITIES)[number];

export const JOB_PRIORITY_LABELS: Record<JobPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

export type JobSource = "manual" | "agent_call" | "api" | "lead" | "quote";

export const JOB_SOURCE_LABELS: Record<JobSource, string> = {
  manual: "Added manually",
  agent_call: "From a call",
  api: "Via the API",
  lead: "Converted from a lead",
  quote: "Converted from a quote",
};

export interface JobContactRef {
  id: string;
  /** AI-created contacts can be number-only, so the name may be missing. */
  name: string | null;
}

export interface JobAssigneeRef {
  id: string;
  name: string;
}

export interface JobLeadRef {
  id: string;
  title: string;
}

export interface JobQuoteRef {
  id: string;
  number: string;
  title: string | null;
}

export interface JobInvoiceRef {
  id: string;
  number: string;
  status: string;
}

export interface JobCallRef {
  id: string;
  summary_title: string | null;
  created_at: string;
}

/** Free-shape JSON on the backend; the form writes these keys. */
export interface JobServiceAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

/** Mirrors app/Http/Resources/BusinessJobLineItemResource.php */
export interface JobLineItem {
  id: string;
  kind: LineItemKind;
  description: string;
  /** Decimal serialized as a string, e.g. "2.00". */
  quantity: string;
  unit_price_cents: number;
  /** Stored = round(quantity × unit_price); the job caches the sum as quote_cents. */
  amount_cents: number;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  /** Customer-facing reference, e.g. "JOB-4". */
  reference: string;
  number: number;
  title: string;
  description: string | null;
  status: JobStatus;
  priority: JobPriority;
  service_address: JobServiceAddress | null;
  /** Visit length; null = use the module default. */
  estimated_minutes: number | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  /** Cached sum of line-item amounts; null = not priced yet. */
  quote_cents: number | null;
  currency: string | null;
  source: JobSource;
  completed_at: string | null;
  canceled_at: string | null;
  canceled_reason: string | null;
  contact: JobContactRef | null;
  assignee: JobAssigneeRef | null;
  /** The originating lead — only loaded on the detail endpoint and mutations. */
  lead?: JobLeadRef | null;
  /** The accepted quote it was raised from — only loaded on the detail endpoint. */
  quote?: JobQuoteRef | null;
  /** Invoices raised off this job — only loaded on the detail endpoint. */
  invoices?: JobInvoiceRef[];
  /** The call that captured it — only loaded on the detail endpoint. */
  call?: JobCallRef | null;
  line_items?: JobLineItem[];
  created_at: string;
  updated_at: string;
}

/** Mirrors app/Http/Resources/BusinessJobActivityResource.php */
export type JobActivityType = "note" | "status_change" | "scheduled" | "call" | "assigned";

export interface JobActivity {
  id: string;
  type: JobActivityType;
  body: string | null;
  /** status_change carries {from, to}; other types vary. */
  metadata: Record<string, unknown> | null;
  /** Null = recorded by the system or the AI agent. */
  user: { id: string; name: string } | null;
  created_at: string;
}

/** One row from GET jobs/{uuid}/photos — Spatie media with a signed, expiring URL. */
export interface JobPhoto {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  url: string;
  created_at: string;
}

export interface JobCounts {
  /** Jobs not yet closed (open + scheduled + in_progress). */
  active: number;
  /** Literally status=open — the unscheduled work queue. */
  open: number;
  scheduled: number;
  in_progress: number;
  completed: number;
  canceled: number;
  all: number;
  high_priority_active: number;
  /** Scheduled visits starting today, business-local. */
  scheduled_today: number;
  /** Sum of quote_cents across active jobs. */
  active_value_cents: number;
  completed_this_month_cents: number;
}

/**
 * Index filters — `status` takes a comma-joined list or the literal "active"
 * (the not-yet-closed scope; "open" is a real job status here, unlike leads).
 */
export interface JobListFilters {
  status?: string;
  priority?: JobPriority;
  contact_id?: string;
  assignee_user_id?: string;
  scheduled_from?: string;
  scheduled_to?: string;
  q?: string;
  /** Omitted = newest first. */
  sort?: "scheduled_start" | "quote";
}

export interface StoreJobPayload {
  title: string;
  contact_id: string;
  description?: string;
  priority?: JobPriority;
  service_address?: JobServiceAddress;
  assignee_user_id?: string;
  estimated_minutes?: number;
  currency?: string;
  /** Seeds the first note on the timeline. */
  details?: string;
}

/** Descriptive fields only — status moves through the transition endpoints. */
export interface UpdateJobPayload {
  title?: string;
  description?: string | null;
  priority?: JobPriority;
  service_address?: JobServiceAddress | null;
  assignee_user_id?: string | null;
  estimated_minutes?: number | null;
  currency?: string | null;
}

export interface StoreJobLineItemPayload {
  kind?: LineItemKind;
  description: string;
  quantity?: number;
  unit_price_cents?: number;
  position?: number;
}

export type UpdateJobLineItemPayload = Partial<StoreJobLineItemPayload>;

/** Effective jobs-module settings from GET modules/jobs/settings. */
export interface JobModuleSettings {
  /** Let the voice agent book job visits with check_job_availability/book_job. */
  allow_agent_scheduling: boolean;
  /** Visit length offered/booked when a job carries no estimate. */
  default_estimated_minutes: number;
}
