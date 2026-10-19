/**
 * end_reason is free-form: ElevenLabs termination_reason (truncated to 40
 * chars), a Twilio status, or a pipeline stamp. Known values get proper
 * labels; anything else falls back to a snake_case humanizer — never throws.
 */
import { labelMap } from "@/lib/i18n/label-map";

const END_REASON_LABELS: Record<string, string> = labelMap("lib.endReason", [
  "customer_ended_call",
  "agent_ended_call",
  "transferred",
  "no_conversation",
  "no_answer",
  "busy",
  "canceled",
  "failed",
  "unknown",
]);

/** Values that share another reason's label. */
const END_REASON_ALIASES: Record<string, string> = {
  transfer_completed: "transferred",
  transfer_bridged: "transferred",
  transfer: "transferred",
};

export function formatEndReason(reason: string | null): string | null {
  if (reason === null || reason === "") return null;
  const key = Object.hasOwn(END_REASON_ALIASES, reason) ? END_REASON_ALIASES[reason] : reason;
  if (Object.hasOwn(END_REASON_LABELS, key)) return END_REASON_LABELS[key];
  const spaced = reason.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
