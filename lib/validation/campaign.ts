import { z } from "zod";
import type {
  Agent,
  Campaign,
  CreateCampaignPayload,
  UpdateCampaignPayload,
} from "@/lib/api/types";
import { CAMPAIGN_RETRY_REASONS } from "@/lib/api/types";
import { utcIsoToZonedFields, zonedDateTimeToUtcIso } from "@/lib/datetime";
import {
  defaultWeeklyHours,
  hourRowSchema,
  toApiHourRows,
  toEditableWeek,
  validateHourRows,
} from "@/lib/validation/weekly-hours";

/**
 * Agents a campaign can dial with: published outbound agents only. Inbound
 * and consult agents are rejected by the backend at start time.
 */
export function campaignReadyAgents(agents: Agent[] | undefined): Agent[] {
  return (agents ?? []).filter(
    (agent) =>
      agent.purpose === "outbound" &&
      agent.status === "active" &&
      agent.sync_status === "in_sync"
  );
}

/**
 * Loose mirror — the backend stays the validation authority. Schedule fields
 * travel as wall-clock date + time pairs in the business timezone ("" = unset)
 * and are composed into UTC instants in the payload mappers.
 */
const campaignBaseShape = {
  name: z.string().min(1, "Name is required").max(120, "Keep the name under 120 characters"),
  agent_id: z.string().min(1, "Pick an outbound agent"),
  caller_phone_number_id: z.string().min(1, "Pick a caller number"),
  start_date: z.string(),
  start_time: z.string(),
  end_date: z.string(),
  end_time: z.string(),
  // Registered with { valueAsNumber: true } — a cleared input becomes NaN,
  // which z.number() rejects, so the backend limits never see garbage.
  max_concurrent: z
    .number("Enter a number")
    .int("Whole numbers only")
    .min(1, "At least 1 call at a time")
    .max(50, "At most 50 calls at a time"),
  max_attempts: z
    .number("Enter a number")
    .int("Whole numbers only")
    .min(1, "At least 1 attempt")
    .max(5, "At most 5 attempts"),
  retry_delay_minutes: z
    .number("Enter a number")
    .int("Whole numbers only")
    .min(5, "At least 5 minutes between attempts")
    .max(1440, "At most 24 hours between attempts"),
  retry_on: z.array(z.enum(CAMPAIGN_RETRY_REASONS)),
};

function refineSchedule(
  values: { start_date: string; start_time: string; end_date: string; end_time: string },
  ctx: z.RefinementCtx
): void {
  if (values.start_date !== "" && values.start_time === "") {
    ctx.addIssue({ code: "custom", path: ["start_time"], message: "Pick a start time" });
  }
  if (values.start_time !== "" && values.start_date === "") {
    ctx.addIssue({ code: "custom", path: ["start_date"], message: "Pick a start date" });
  }
  if (values.end_date !== "" && values.end_time === "") {
    ctx.addIssue({ code: "custom", path: ["end_time"], message: "Pick an end time" });
  }
  if (values.end_time !== "" && values.end_date === "") {
    ctx.addIssue({ code: "custom", path: ["end_date"], message: "Pick an end date" });
  }
  // Same-zone wall-clock strings compare correctly as strings.
  const start = values.start_date !== "" && values.start_time !== "";
  const end = values.end_date !== "" && values.end_time !== "";
  if (start && end) {
    const startsAt = `${values.start_date}T${values.start_time}`;
    const endsAt = `${values.end_date}T${values.end_time}`;
    if (endsAt < startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["end_date"],
        message: "The end must be after the start",
      });
    }
  }
}

export const campaignCreateSchema = z.object(campaignBaseShape).superRefine(refineSchedule);

export type CampaignCreateValues = z.infer<typeof campaignCreateSchema>;

export const campaignSettingsSchema = z
  .object({
    ...campaignBaseShape,
    hours_mode: z.enum(["inherit", "custom"]),
    calling_hours: z.array(hourRowSchema),
    /** Array of pairs, not a record — RHF paths with user-authored keys are fragile. */
    default_variables: z.array(z.object({ name: z.string(), value: z.string() })),
  })
  .superRefine((values, ctx) => {
    refineSchedule(values, ctx);
    if (values.hours_mode === "custom") {
      validateHourRows(values.calling_hours, ctx, ["calling_hours"]);
    }
  });

export type CampaignSettingsValues = z.infer<typeof campaignSettingsSchema>;

/** Backend 422 keys → form field names. Schedule pairs differ, and dotted
 * calling-hours row keys flatten onto the top-level field so the message
 * surfaces next to the editor instead of vanishing into a nested error. */
export function campaignServerFieldKey(key: string): string {
  if (key === "start_at") return "start_date";
  if (key === "end_at") return "end_date";
  if (key.startsWith("calling_hours.")) return "calling_hours";
  return key;
}

/** Matches CampaignService::DEFAULTS. */
export function defaultCampaignCreateValues(): CampaignCreateValues {
  return {
    name: "",
    agent_id: "",
    caller_phone_number_id: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    max_concurrent: 2,
    max_attempts: 2,
    retry_delay_minutes: 120,
    retry_on: ["no_answer", "busy"],
  };
}

function composeInstant(
  date: string,
  time: string,
  timeZone: string
): string | null {
  if (date === "" || time === "") return null;
  return zonedDateTimeToUtcIso(date, time, timeZone);
}

export function toCampaignCreatePayload(
  values: CampaignCreateValues,
  timeZone: string
): CreateCampaignPayload {
  return {
    name: values.name.trim(),
    agent_id: values.agent_id,
    caller_phone_number_id: values.caller_phone_number_id,
    start_at: composeInstant(values.start_date, values.start_time, timeZone),
    end_at: composeInstant(values.end_date, values.end_time, timeZone),
    max_concurrent: values.max_concurrent,
    max_attempts: values.max_attempts,
    retry_delay_minutes: values.retry_delay_minutes,
    retry_on: values.retry_on,
  };
}

function toZonedPair(iso: string | null, timeZone: string): { date: string; time: string } {
  if (iso === null) return { date: "", time: "" };
  return utcIsoToZonedFields(iso, timeZone);
}

export function toCampaignSettingsValues(
  campaign: Campaign,
  timeZone: string
): CampaignSettingsValues {
  const start = toZonedPair(campaign.start_at, timeZone);
  const end = toZonedPair(campaign.end_at, timeZone);
  const custom = campaign.calling_hours ?? [];
  return {
    name: campaign.name,
    agent_id: campaign.agent?.id ?? "",
    caller_phone_number_id: campaign.caller_number?.id ?? "",
    start_date: start.date,
    start_time: start.time,
    end_date: end.date,
    end_time: end.time,
    max_concurrent: campaign.max_concurrent,
    max_attempts: campaign.max_attempts,
    retry_delay_minutes: campaign.retry_delay_minutes,
    retry_on: campaign.retry_on,
    hours_mode: custom.length > 0 ? "custom" : "inherit",
    calling_hours: custom.length > 0 ? toEditableWeek(custom) : defaultWeeklyHours(),
    default_variables: Object.entries(campaign.default_variables ?? {}).map(
      ([name, value]) => ({ name, value })
    ),
  };
}

export function toCampaignSettingsPayload(
  values: CampaignSettingsValues,
  timeZone: string
): UpdateCampaignPayload {
  const variables: Record<string, string> = {};
  for (const pair of values.default_variables) {
    // Empty stays unset. The pairs are re-keyed to the agent's own set (custom
    // variables plus the built-ins it marks overridable), so every name is one
    // the API accepts.
    if (pair.value.trim() === "") continue;
    variables[pair.name] = pair.value.trim();
  }
  return {
    name: values.name.trim(),
    agent_id: values.agent_id,
    caller_phone_number_id: values.caller_phone_number_id,
    start_at: composeInstant(values.start_date, values.start_time, timeZone),
    end_at: composeInstant(values.end_date, values.end_time, timeZone),
    max_concurrent: values.max_concurrent,
    max_attempts: values.max_attempts,
    retry_delay_minutes: values.retry_delay_minutes,
    retry_on: values.retry_on,
    default_variables: variables,
    // Always sent: null clears back to trading hours, a week replaces.
    calling_hours: values.hours_mode === "custom" ? toApiHourRows(values.calling_hours) : null,
  };
}
