/** Mirrors app/Http/Resources/CalendarConnectionResource.php */
export interface CalendarConnection {
  id: string;
  /** Only Microsoft 365 today. */
  provider: "microsoft";
  /** The connected mailbox; empty until the account is resolved. */
  account_email: string | null;
  status: "active" | "error" | "revoked";
  /** The single selected, sync-enabled connection (at most one per member). */
  is_active: boolean;
  last_error: string | null;
  created_at: string;
}
