import type { ApiError } from "@/lib/api/errors";
import { labelMap } from "@/lib/i18n/label-map";

/** Start-ladder 422 reason codes → copy a person can act on. */
const START_ERROR_MESSAGES: Record<string, string> = labelMap("campaigns.startErrors", [
  "campaign_not_startable",
  "campaign_agent_not_ready",
  "campaign_number_not_ready",
  "campaign_number_not_dialable",
  "campaign_no_recipients",
  "campaign_locked",
]);

export function campaignActionErrorMessage(error: ApiError): string {
  return (error.reason && START_ERROR_MESSAGES[error.reason]) || error.message;
}
