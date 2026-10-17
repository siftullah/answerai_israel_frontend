/**
 * end_reason is free-form: ElevenLabs termination_reason (truncated to 40
 * chars), a Twilio status, or a pipeline stamp. Known values get proper
 * labels; anything else falls back to a snake_case humanizer — never throws.
 */
const END_REASON_LABELS: Record<string, string> = {
  customer_ended_call: "Caller hung up",
  agent_ended_call: "Agent ended the call",
  transfer_completed: "Transferred",
  transfer_bridged: "Transferred",
  transfer: "Transferred",
  transferred: "Transferred",
  no_conversation: "No conversation",
  no_answer: "No answer",
  busy: "Busy",
  canceled: "Cancelled",
  failed: "Failed",
  unknown: "Unknown",
};

export function formatEndReason(reason: string | null): string | null {
  if (reason === null || reason === "") return null;
  const known = END_REASON_LABELS[reason];
  if (known) return known;
  const spaced = reason.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
