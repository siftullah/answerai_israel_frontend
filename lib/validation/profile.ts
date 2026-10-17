import { z } from "zod";
import type { Membership, UpdateProfilePayload, User } from "@/lib/api/types";
import { formatE164, normalizeAuPhone, optionalAuPhoneField } from "@/lib/phone";

/**
 * Form-facing schema for the signed-in user's own profile. Text inputs hold
 * "" for unset values (the payload builder converts phone/position to null).
 */
export const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100, "Keep the first name under 100 characters"),
  last_name: z.string().min(1, "Last name is required").max(100, "Keep the last name under 100 characters"),
  email: z.email("Enter a valid email address"),
  // Loose AU shape gate; the backend's Phone rule stays the authority.
  phone_e164: optionalAuPhoneField(),
  position: z.string().max(150, "Keep the position under 150 characters"),
});

export type ProfileValues = z.infer<typeof profileSchema>;

export function toProfileValues(user: User, membership: Membership): ProfileValues {
  return {
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    email: user.email ?? "",
    phone_e164: membership.phone_e164 ? formatE164(membership.phone_e164) : "",
    position: membership.position ?? "",
  };
}

/**
 * Builds the PATCH body from ONLY the dirty fields. `return_to` rides along
 * with an email change so the backend can send the user back here after the
 * emailed confirmation.
 */
export function toProfilePayload(
  values: ProfileValues,
  dirty: Partial<Record<keyof ProfileValues, unknown>>,
  returnTo?: string
): UpdateProfilePayload {
  const payload: UpdateProfilePayload = {};

  if (dirty.first_name) payload.first_name = values.first_name.trim();
  if (dirty.last_name) payload.last_name = values.last_name.trim();
  if (dirty.email) {
    payload.email = values.email.trim();
    if (returnTo) payload.return_to = returnTo;
  }
  if (dirty.phone_e164) {
    payload.phone_e164 = values.phone_e164 === "" ? null : normalizeAuPhone(values.phone_e164);
  }
  if (dirty.position) {
    payload.position = values.position.trim() === "" ? null : values.position.trim();
  }

  return payload;
}
