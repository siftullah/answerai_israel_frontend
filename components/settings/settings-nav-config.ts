import {
  BellIcon,
  CalendarClockIcon,
  CreditCardIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for the Settings sub-navigation. Mirrors the
 * business-profile SectionNav pattern; the breadcrumb entries in the main
 * nav-config are kept in step with these segments by hand (there are only
 * four). Privileged items render only for owner/admin.
 */
export interface SettingsNavItem {
  title: string;
  /** Path segment under /b/{uuid}. */
  segment: string;
  icon: LucideIcon;
  /** Match the pathname exactly instead of by prefix. */
  exact?: boolean;
  /** Shown only to owner/admin memberships. */
  privileged?: boolean;
}

export const settingsNavItems: SettingsNavItem[] = [
  { title: "Profile", segment: "settings/profile", icon: UserRoundIcon },
  { title: "Calendar", segment: "settings/calendar", icon: CalendarClockIcon },
  { title: "Notifications", segment: "settings/notifications", icon: BellIcon },
  { title: "Billing", segment: "settings/billing", icon: CreditCardIcon, privileged: true },
];
