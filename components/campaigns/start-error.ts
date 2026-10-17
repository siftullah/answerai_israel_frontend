import type { ApiError } from "@/lib/api/errors";

/** Start-ladder 422 reason codes → copy a person can act on. */
const START_ERROR_MESSAGES: Record<string, string> = {
  campaign_not_startable: "Only draft or scheduled campaigns can be started.",
  campaign_agent_not_ready:
    "The agent must be an active, published outbound agent before the campaign can dial.",
  campaign_number_not_ready: "The caller number isn't active yet.",
  campaign_number_not_dialable:
    "SIP numbers can't dial campaigns — pick one of your Twilio numbers.",
  campaign_no_recipients: "Add at least one recipient before starting.",
  campaign_locked: "This campaign has finished and can no longer change.",
};

export function campaignActionErrorMessage(error: ApiError): string {
  return (error.reason && START_ERROR_MESSAGES[error.reason]) || error.message;
}
