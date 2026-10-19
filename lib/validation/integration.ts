import { z } from "zod";
import type { BusinessIntegration, IntegrationSettings } from "@/lib/api/types";
import type { Translator } from "@/lib/i18n/types";

/** `t` is a translator scoped to the `validation` namespace. */
export function integrationSettingsSchema(t: Translator) {
  return z.object({
    agency_id: z
      .string()
      .min(1, t("integration.agencyIdRequired"))
      .max(50, t("length.agencyId", { max: 50 })),
    feeds: z.array(z.string()).min(1, t("integration.feedsRequired")),
  });
}

export type IntegrationSettingsValues = z.infer<ReturnType<typeof integrationSettingsSchema>>;

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
