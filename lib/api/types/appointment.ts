/** Mirrors app/Http/Resources/AppointmentResource.php */

import type { CallDirection } from "./call";

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "completed",
  "canceled",
  "no_show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  canceled: "Canceled",
  no_show: "No-show",
};

/** Statuses that can still transition — reschedule/cancel/complete apply. */
export const UPCOMING_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "scheduled",
  "confirmed",
];

export const APPOINTMENT_SOURCES = ["manual", "agent_call", "api"] as const;
export type AppointmentSource = (typeof APPOINTMENT_SOURCES)[number];

export const APPOINTMENT_SOURCE_LABELS: Record<AppointmentSource, string> = {
  manual: "Manual",
  agent_call: "Booked by AI on a call",
  api: "API",
};

export interface AppointmentRef {
  id: string;
  name: string;
}

/** The call an agent booked this on (source = agent_call). */
export interface AppointmentCallRef {
  id: string;
  direction: CallDirection;
  started_at: string | null;
}

export interface Appointment {
  id: string;
  /** UTC instants; render through lib/datetime with business.timezone. */
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  notes: string | null;
  canceled_reason: string | null;
  contact: AppointmentRef | null;
  /** null = the unassigned pool. */
  member: AppointmentRef | null;
  call: AppointmentCallRef | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentCounts {
  upcoming: number;
  today: number;
  needs_review: number;
}

/** Index filters — `status` takes a comma-joined list (backend whereIn). */
export interface AppointmentListFilters {
  status?: string;
  source?: AppointmentSource;
  contact_id?: string;
  /** User uuid, or "unassigned" for the pool. */
  member_id?: string;
  from?: string;
  to?: string;
  /** Open bookings whose end passed without an outcome recorded. */
  needs_review?: boolean;
  q?: string;
  sort?: "newest";
}

export interface StoreAppointmentPayload {
  contact_id: string;
  /** User uuid (member.user.id); omitted = unassigned pool. */
  member_id?: string;
  /** UTC ISO instant. Duration comes from the layered calendar settings. */
  starts_at: string;
  notes?: string;
}

export interface UpdateAppointmentPayload {
  notes: string | null;
}

export interface ReassignAppointmentPayload {
  /** User uuid, or null for the unassigned pool. */
  member_id: string | null;
}
