/** Mirrors app/Http/Resources/BusinessResource.php */
export interface Business {
  id: string;
  name: string;
  status: "active" | (string & {});
  timezone: string;
  created_at: string;
}

export interface UpdateBusinessPayload {
  name?: string;
  /** IANA identifier, e.g. "Asia/Jerusalem". */
  timezone?: string;
}
