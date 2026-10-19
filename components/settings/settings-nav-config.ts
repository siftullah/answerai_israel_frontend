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
 *
 * `title` is a message key under `layout.nav` — renderers translate it with
 * `t(\`nav.${item.title}\`)`; never show it raw.
 */
export interface SettingsNavItem {
  /** Message key under `layout.nav`. */
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
  { title: "profile", segment: "settings/profile", icon: UserRoundIcon },
  { title: "calendar", segment: "settings/calendar", icon: CalendarClockIcon },
  { title: "notifications", segment: "settings/notifications", icon: BellIcon },
  { title: "billing", segment: "settings/billing", icon: CreditCardIcon, privileged: true },
];
