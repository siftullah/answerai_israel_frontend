import type { BusinessMemberRole } from "./member";

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export interface Invitation {
  id: string;
  email: string | null;
  phone_e164: string | null;
  status: InvitationStatus;
  role?: BusinessMemberRole;
  expires_at: string;
  created_at: string;
}

export interface StoreInvitationPayload {
  /** Required unless member_id is given (then taken from the member row). */
  email?: string;
  phone_e164?: string;
  role_id: string;
  /** Links the invitation to an existing account-less member. */
  member_id?: string;
}
