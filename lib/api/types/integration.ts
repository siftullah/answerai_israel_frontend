export type IntegrationStatus = "pending_setup" | "connected" | "error" | "disconnected";

/** Provider-owned connection settings (realestate.com.au: agency + feed selection). */
export interface IntegrationSettings {
  agency_id: string;
  feeds: string[];
}

export interface BusinessIntegration {
  id: string;
  provider: string;
  status: IntegrationStatus;
  settings: IntegrationSettings | null;
  last_synced_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationProviderInfo {
  key: string;
  name: string;
  kind: "pull" | "push";
  feeds: { key: string; name: string; description: string }[];
  connection: BusinessIntegration | null;
}

export interface ConnectIntegrationPayload {
  provider: string;
  settings: IntegrationSettings;
}

export interface UpdateIntegrationPayload {
  settings: IntegrationSettings;
}
