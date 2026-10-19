/** Mirrors DashboardController — the portal home page's single round trip. */

export interface DashboardCallsToday {
  total: number;
  inbound: number;
  outbound: number;
  /** Calls that ran to completion (status = completed). */
  answered: number;
  /** Calls a voicemail system picked up (status = voicemail). */
  voicemail: number;
  /** busy + no_answer + failed. */
  missed: number;
  /** Calls handed to a human (warm or blind). */
  transferred: number;
}

export interface DashboardCalls {
  today: DashboardCallsToday;
  /** Rolling 7-business-day windows for the trend delta. */
  last_7_days: number;
  prev_7_days: number;
  /** Completed calls inside the same rolling windows — the answer-rate inputs. */
  answered_last_7: number;
  answered_prev_7: number;
  minutes_this_month: number;
  /** This month's mean, completed calls only; 0 when there are none. */
  avg_duration_seconds: number;
}

export interface DashboardSeriesPoint {
  /** Business-local calendar day key (YYYY-MM-DD) — never parse with new Date(). */
  date: string;
  inbound: number;
  outbound: number;
}

export interface DashboardHourlyPoint {
  /** Business-local hour of day, 0–23. Always 24 entries. */
  hour: number;
  calls: number;
}

/** Agent-captured records this month. Keys are absent entirely when that
 * module is disabled (mirrors CallRelated). */
export interface DashboardCaptured {
  leads?: number;
  appointments?: number;
  quotes?: number;
  jobs?: number;
  callbacks?: number;
}

export interface DashboardHours {
  open_now: boolean;
  /** Business-local "HH:MM" windows; [] = closed today or no hours set. */
  today_windows: { start: string; end: string }[];
}

export interface DashboardHealth {
  agent_errors: number;
  phone_number_errors: number;
  /** The requesting member's own selected connection is erroring. */
  calendar_disconnected: boolean;
}

export interface DashboardSummary {
  calls: DashboardCalls;
  series: DashboardSeriesPoint[];
  /** Hour-of-day histogram over the series window. */
  hourly: DashboardHourlyPoint[];
  captured: DashboardCaptured;
  hours: DashboardHours;
  health: DashboardHealth;
}
