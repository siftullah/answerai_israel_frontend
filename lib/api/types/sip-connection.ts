export type SipConnectionStatus = "active" | "disconnected";

export interface SipConnection {
  id: string;
  status: SipConnectionStatus;
  username: string;
  domain: string;
  connected_at: string;
  last_rotated_at: string | null;
  disconnected_at: string | null;
  created_at: string;
}

/** Returned exactly once per connect/rotate — the password is never retrievable again. */
export interface SipCredentials {
  username: string;
  password: string;
  domain: string;
  destination_uri_format: string;
}

export interface SipConnectResponse {
  data: SipConnection;
  credentials: SipCredentials;
}
