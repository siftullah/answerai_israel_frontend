import type { Business } from "./business";

/** Mirrors app/Http/Resources/BusinessMemberRoleResource.php */
export interface Role {
  id: string;
  name: string;
  slug: "owner" | "admin" | "member" | (string & {});
  is_system: boolean;
  description: string | null;
}

/**
 * Mirrors app/Http/Resources/BusinessMemberResource.php as returned by
 * /me and /auth/login (business + role eager-loaded; user omitted).
 */
export interface Membership {
  id: string;
  business: Business;
  role: Role;
  position: string | null;
  phone_e164: string | null;
  created_at: string;
}
