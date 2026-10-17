/** A team member (by BusinessMember uuid) or any other address. */
export type CallSummaryRecipient =
  | { type: "member"; member_id: string }
  | { type: "custom"; email: string };

/** Per-agent settings for the post-call summary emails. */
export interface CallSummarySettings {
  enabled: boolean;
  recipients: CallSummaryRecipient[];
  /** Plain-English instructions the summarising assistant follows. */
  rules: string[];
  updated_at: string | null;
}

export type UpdateCallSummarySettingsPayload = Omit<CallSummarySettings, "updated_at">;

/**
 * Outcome of composing a sample from the agent's latest completed call with
 * the SAVED settings. `sent: false` + `reason` = the assistant decided nobody
 * needed that call, not a failure.
 */
export interface CallSummaryTestResult {
  sent: boolean;
  /** The assistant's working: what the call was and who (if anyone) needs it. */
  reason: string | null;
  subject: string | null;
  /** Every email it drafted, with who it would really have gone to. */
  emails: Array<{ recipient_emails: string[]; subject: string }>;
  call_id: string | null;
  /** The signed-in user's address — samples never go to the real recipients. */
  sent_to: string;
}
