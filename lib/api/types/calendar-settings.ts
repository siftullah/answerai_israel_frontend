/** Resolved (layered) settings from GET calendar/business-settings. */
export interface CalendarBusinessSettings {
  slot_interval_minutes: number;
  min_notice_minutes: number;
  max_horizon_days: number;
  buffer_minutes: number;
  max_bookings_per_day: number | null;
  appointment_duration_minutes: number;
  callback_duration_minutes: number;
  /** Member-personal — shown in the resolved payload but not editable here. */
  sync_appointments: boolean;
  sync_callbacks: boolean;
}

export const SLOT_INTERVALS = [5, 10, 15, 20, 30, 60] as const;

/** Business-tier keys only. */
export type UpdateCalendarBusinessSettingsPayload = Partial<
  Omit<CalendarBusinessSettings, "sync_appointments" | "sync_callbacks">
>;
