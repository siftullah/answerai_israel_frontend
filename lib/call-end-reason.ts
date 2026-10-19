/**
 * Why a call ended. The backend folds the provider's raw reason (an ElevenLabs
 * termination_reason, a Twilio status, a pipeline stamp) onto a stable
 * `end_reason_code` that is translated here; `end_reason` is English wording
 * that only matters for `other`, where the provider's own text is all there is.
 * Never throws: an unknown code falls back to the humanized text.
 */
import type { CallEndReason } from "@/lib/api/types";
import { labelMap } from "@/lib/i18n/label-map";

type CodedEndReason = Exclude<CallEndReason, "other">;

const END_REASON_LABELS: Record<CodedEndReason, string> = labelMap("lib.endReason", [
  "voicemail",
  "ended_by_agent",
  "ended_by_caller",
  "transferred",
  "no_answer",
  "busy",
  "canceled",
  "completed",
  "time_limit",
  "failed",
] satisfies readonly CodedEndReason[]);

export function formatEndReason(
  code: string | null | undefined,
  reason: string | null | undefined
): string | null {
  if (code && Object.hasOwn(END_REASON_LABELS, code)) {
    return END_REASON_LABELS[code as CodedEndReason];
  }
  if (!reason) return null;
  const spaced = reason.replace(/[_-]+/g, " ").trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : null;
}
