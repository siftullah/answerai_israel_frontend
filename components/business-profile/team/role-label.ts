import type { BusinessMemberRole } from "@/lib/api/types";
import { rt } from "@/lib/i18n/runtime";

const SYSTEM_ROLES = new Set(["owner", "admin", "member"]);

/**
 * The API ships the three system roles with English names; custom roles are
 * named by the business and shown as-is.
 */
export function roleLabel(role: BusinessMemberRole | null | undefined): string | null {
  if (!role) return null;
  return role.is_system && SYSTEM_ROLES.has(role.slug)
    ? rt(`lib.systemRole.${role.slug}`)
    : role.name;
}
