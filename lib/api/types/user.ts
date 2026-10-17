/** Mirrors the media block on app/Http/Resources/UserResource.php */
export interface UserAvatar {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  url: string;
  created_at: string;
}

/** Mirrors app/Http/Resources/UserResource.php */
export interface User {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  /** A requested new email awaiting confirmation; null when none is pending. */
  pending_email: string | null;
  email_verified: boolean;
  avatar: UserAvatar | null;
  created_at: string;
}

/**
 * PATCH /me body — every field optional (backend treats them as `sometimes`).
 * Name/email are account-level; phone/position are the current membership's.
 * A changed email starts the pending-confirm flow; `return_to` is the SPA URL
 * to land on after the emailed confirmation.
 */
export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_e164?: string | null;
  position?: string | null;
  return_to?: string;
}

/** PUT /me/password body. */
export interface UpdatePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}
