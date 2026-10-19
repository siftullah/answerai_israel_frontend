import { toast } from "sonner";
import type { FromContactsSummary, RecipientsSummary } from "@/lib/api/types";
import { rt } from "@/lib/i18n/runtime";

/** One toast for every add path — zero parts are omitted. */
export function toastRecipientsSummary(
  summary: RecipientsSummary | FromContactsSummary
): void {
  const skippedNoPhone = "skipped_no_phone" in summary ? summary.skipped_no_phone : 0;
  const parts = [
    summary.inserted > 0 ? rt("campaigns.summary.added", { count: summary.inserted }) : null,
    summary.duplicates > 0
      ? rt("campaigns.summary.duplicates", { count: summary.duplicates })
      : null,
    summary.dnc_blocked > 0
      ? rt("campaigns.summary.dncBlocked", { count: summary.dnc_blocked })
      : null,
    summary.invalid > 0 ? rt("campaigns.summary.invalid", { count: summary.invalid }) : null,
    skippedNoPhone > 0 ? rt("campaigns.summary.noPhone", { count: skippedNoPhone }) : null,
  ].filter(Boolean);

  const message = parts.length > 0 ? parts.join(" · ") : rt("campaigns.summary.nothingToAdd");
  if (summary.inserted > 0) {
    toast.success(message);
  } else {
    toast.warning(message);
  }
}
