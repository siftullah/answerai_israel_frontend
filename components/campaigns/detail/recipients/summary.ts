import { toast } from "sonner";
import type { FromContactsSummary, RecipientsSummary } from "@/lib/api/types";

/** One toast for every add path — zero parts are omitted. */
export function toastRecipientsSummary(
  summary: RecipientsSummary | FromContactsSummary
): void {
  const skippedNoPhone = "skipped_no_phone" in summary ? summary.skipped_no_phone : 0;
  const parts = [
    summary.inserted > 0 ? `Added ${summary.inserted}` : null,
    summary.duplicates > 0 ? `${summary.duplicates} already in the campaign` : null,
    summary.dnc_blocked > 0 ? `${summary.dnc_blocked} on the do-not-call list` : null,
    summary.invalid > 0 ? `${summary.invalid} invalid` : null,
    skippedNoPhone > 0 ? `${skippedNoPhone} without a phone number` : null,
  ].filter(Boolean);

  const message = parts.length > 0 ? parts.join(" · ") : "Nothing to add";
  if (summary.inserted > 0) {
    toast.success(message);
  } else {
    toast.warning(message);
  }
}
