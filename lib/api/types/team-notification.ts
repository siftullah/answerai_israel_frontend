import type { CallSummaryRecipient } from "./agent-call-summary";
import type { ModuleKey } from "./module";

/** Mirrors app/Enums/TeamNotificationType.php */
export type TeamNotificationType =
  | "new_lead"
  | "new_job"
  | "new_quote_request"
  | "team_callback_reminder";

/** The portal module each notification belongs to — its card hides with the module. */
export const TEAM_NOTIFICATION_MODULE: Record<TeamNotificationType, ModuleKey> = {
  new_lead: "leads",
  new_job: "jobs",
  new_quote_request: "quotes",
  team_callback_reminder: "callbacks",
};

/** A team member (by BusinessMember uuid) or any other address — same shape as call summaries. */
export type TeamNotificationRecipient = CallSummaryRecipient;

/**
 * Business-level routing for one team notification. Mirrors
 * app/Http/Resources/TeamNotificationSettingResource.php. Off (or never saved),
 * the email goes to its built-in default: the record's assignee, else the owner.
 */
export interface TeamNotificationSettings {
  type: TeamNotificationType;
  enabled: boolean;
  recipients: TeamNotificationRecipient[];
  /** Plain-English instructions the routing assistant follows. */
  rules: string[];
  updated_at: string | null;
}

export type UpdateTeamNotificationSettingsPayload = Omit<
  TeamNotificationSettings,
  "type" | "updated_at"
>;

/**
 * Outcome of routing the latest AI-captured record of this kind under the SAVED
 * settings. Nothing is sent. `routed: false` + `reason` = the assistant would
 * have chosen nobody, not a failure.
 */
export interface TeamNotificationTestResult {
  routed: boolean;
  /** The assistant's working: what the record is and who should get it. */
  reason: string | null;
  /** The addresses it chose, validated against the pool. */
  recipients: string[];
  record: { id: string; label: string };
}
