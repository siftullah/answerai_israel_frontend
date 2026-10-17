import { z } from "zod";
import type { BusinessIntegration, IntegrationSettings } from "@/lib/api/types";

export const integrationSettingsSchema = z.object({
  agency_id: z
    .string()
    .min(1, "Agency ID is required")
    .max(50, "Agency ID must be 50 characters or fewer"),
  feeds: z.array(z.string()).min(1, "Select at least one feed"),
});

export type IntegrationSettingsValues = z.infer<typeof integrationSettingsSchema>;

/**
 * Prefill from the connection's saved settings when they exist — including a
 * disconnected record, so reconnecting restores the previous selection. New
 * connections start with every catalog feed checked.
 */
export function toIntegrationSettingsValues(
  connection: BusinessIntegration | null,
  catalogFeedKeys: string[]
): IntegrationSettingsValues {
  const settings = connection?.settings;
  if (!settings) {
    return { agency_id: "", feeds: [...catalogFeedKeys] };
  }
  return {
    agency_id: settings.agency_id ?? "",
    // Drop feed keys the catalog no longer offers — they'd be uncheckable.
    feeds: (settings.feeds ?? []).filter((key) => catalogFeedKeys.includes(key)),
  };
}

export function toIntegrationSettingsPayload(
  values: IntegrationSettingsValues
): IntegrationSettings {
  return {
    agency_id: values.agency_id.trim(),
    feeds: values.feeds,
  };
}
