/**
 * Mirrors CalendarViewController (system-view / connected-view) and
 * CalendarSlotController. The two views are deliberately never merged: the
 * system view is our own bookings; the connected view is a live, view-only
 * replica of the member's own external calendar.
 */

import type { AppointmentStatus } from "./appointment";
import type { CallbackStatus } from "./callback";
import type { JobStatus } from "./job";

export interface CalendarItemRef {
  id: string;
  name: string;
}

interface SystemCalendarItemBase {
  id: string;
  title: string;
  /** UTC instants; a callback's ends_at is start + the assignee's callback duration. */
  starts_at: string;
  ends_at: string;
  contact: CalendarItemRef | null;
  member: CalendarItemRef | null;
}

/**
 * Canceled items are excluded server-side; agent callbacks (no assignee) never
 * appear. Jobs arrive only when booked — never terminal or unscheduled, so in
 * practice only scheduled/in_progress. Portal-only: jobs never sync externally.
 */
export type SystemCalendarItem =
  | (SystemCalendarItemBase & { type: "appointment"; status: AppointmentStatus })
  | (SystemCalendarItemBase & { type: "callback"; status: CallbackStatus })
  | (SystemCalendarItemBase & { type: "job"; status: JobStatus });

export interface CalendarSlot {
  /** UTC instants. */
  starts_at: string;
  ends_at: string;
  /** Pre-formatted business-local start label from the backend. */
  local: string;
}

export interface ConnectedCalendarEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  /** False = the slot shows as free/tentative in the external calendar. */
  busy: boolean;
  location: string | null;
  /** Our own pushed copy of a system booking. */
  is_ours: boolean;
}

export interface ConnectedCalendarView {
  connected: boolean;
  provider?: "microsoft";
  account_email?: string | null;
  /** False when the provider call failed — show a soft degraded state, not an error. */
  available: boolean;
  events: ConnectedCalendarEvent[];
}
