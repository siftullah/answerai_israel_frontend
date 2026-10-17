export type TransferMode = "blind" | "screened";
export type HoursMode = "inherit" | "member" | "custom" | "bypass";

/** Short labels for badges/tables — the pickers carry their own card copy. */
export const HOURS_MODE_LABELS: Record<HoursMode, string> = {
  inherit: "Business hours",
  member: "Availability",
  custom: "Custom",
  bypass: "Always",
};

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** H:i strings, e.g. "09:00". */
export interface HoursWindow {
  start: string;
  end: string;
}

export interface BusinessHourRow {
  id?: string;
  day: Weekday;
  is_available: boolean;
  /** null on unavailable days; only sent days come back — not all 7. */
  windows: HoursWindow[] | null;
}

/** Outbound rows are always complete: windows [] when unavailable. */
export interface BusinessHourRowPayload {
  day: Weekday;
  is_available: boolean;
  windows: HoursWindow[];
}

/** Wire shape for SAVING hours: unavailable days must omit `windows` —
 * the backend's min:1 rule 422s on an empty array. */
export interface BusinessHourRowApiPayload {
  day: Weekday;
  is_available: boolean;
  windows?: HoursWindow[];
}

export interface TransferTarget {
  id: string;
  /** null = business-wide directory entry. */
  agent?: { id: string; name: string } | null;
  name: string;
  business_member?: { id: string; phone_e164: string | null } | null;
  to_e164: string | null;
  mode: TransferMode;
  condition: string;
  post_dial_digits: string | null;
  hours_mode: HoursMode;
  custom_hours?: BusinessHourRow[];
  created_at: string;
  updated_at: string;
}

export interface TransferTargetPayload {
  /** Create only — scopes the entry to one agent's own directory. */
  agent_id?: string;
  name?: string;
  business_member_id?: string | null;
  to_e164?: string | null;
  /** Create only — a scope's targets must all share one mode. */
  mode?: TransferMode;
  condition?: string;
  post_dial_digits?: string | null;
  hours_mode?: HoursMode;
  custom_hours?: BusinessHourRowApiPayload[];
}
