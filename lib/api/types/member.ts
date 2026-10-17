import type { User } from "./user";
import type { BusinessHourRow, BusinessHourRowApiPayload } from "./transfer-target";

export interface BusinessMemberRole {
  id: string;
  name: string;
  slug: string;
  is_system: boolean;
  description: string | null;
}

export interface BusinessMember {
  id: string;
  user?: User | null;
  role?: BusinessMemberRole;
  name: string;
  first_name: string | null;
  last_name: string | null;
  /** Resolved: the linked account's email when there is one. */
  email: string | null;
  position: string | null;
  phone_e164: string | null;
  /** Empty array = follows the business trading hours. */
  calling_hours?: BusinessHourRow[];
  has_account: boolean;
  /** Only present on the index listing. */
  has_calendar_connected?: boolean;
  created_at: string;
}

export interface StoreMemberPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone_e164?: string | null;
  position?: string | null;
  /** Defaults to the system "member" role; "owner" is not assignable. */
  role_id?: string | null;
  calling_hours?: BusinessHourRowApiPayload[];
}

export type UpdateMemberPayload = Partial<Omit<StoreMemberPayload, "calling_hours">> & {
  /** null clears back to business hours; absent leaves the saved week untouched. */
  calling_hours?: BusinessHourRowApiPayload[] | null;
};
