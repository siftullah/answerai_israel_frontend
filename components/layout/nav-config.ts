import {
  BotIcon,
  Building2Icon,
  CalendarDaysIcon,
  CalendarIcon,
  FileTextIcon,
  HashIcon,
  LayoutDashboardIcon,
  PhoneIcon,
  ReceiptTextIcon,
  TargetIcon,
  UsersIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import { sectionCrumbs } from "@/components/business-profile/section-nav-config";
import type { ModuleKey } from "@/lib/api/types";

/**
 * Single source of truth for portal navigation: the sidebar renders from
 * this list and the breadcrumb resolves against it, so the two can never
 * disagree. Items (and children) with a `module` key only show while that
 * module is enabled for the business.
 */
export interface NavChild {
  title: string;
  /** Path segment under /b/{uuid}. */
  segment: string;
  /** Match the pathname exactly instead of by prefix. */
  exact?: boolean;
  /** Shown only while this module is enabled for the business. */
  module?: ModuleKey;
  /**
   * Breadcrumb-only descendants (e.g. Settings → Profile) — resolved by
   * activeNavTrail but never rendered in a sidebar.
   */
  crumbChildren?: NavChild[];
}

export interface NavItem {
  title: string;
  /** Path segment under /b/{uuid}; "" is the dashboard index. */
  segment: string;
  icon: LucideIcon;
  /** Match the pathname exactly instead of by prefix (dashboard index). */
  exact?: boolean;
  /** Shown only while this module is enabled for the business. */
  module?: ModuleKey;
  /** Sub-links; the parent row is then an expand toggle, not a page. */
  children?: NavChild[];
  /**
   * Breadcrumb-only descendants: resolved by activeNavTrail but never
   * rendered in the sidebar (the page has its own sub-navigation).
   */
  crumbChildren?: NavChild[];
}

export const navMain: NavItem[] = [
  { title: "Dashboard", segment: "", icon: LayoutDashboardIcon, exact: true },
  {
    title: "Contacts",
    segment: "contacts",
    icon: UsersIcon,
    children: [
      { title: "All contacts", segment: "contacts", exact: true },
      { title: "Do not call (DNC)", segment: "contacts/dnc" },
    ],
  },
  {
    title: "Calls",
    segment: "calls",
    icon: PhoneIcon,
    children: [
      { title: "Inbound logs", segment: "calls/inbound-logs" },
      { title: "Outbound logs", segment: "calls/outbound-logs" },
      { title: "Callbacks", segment: "calls/callbacks", module: "callbacks" },
      { title: "Campaigns", segment: "calls/campaigns" },
    ],
  },
  { title: "Calendar", segment: "calendar", icon: CalendarIcon },
  { title: "Appointments", segment: "appointments", icon: CalendarDaysIcon, module: "appointments" },
  { title: "Leads", segment: "leads", icon: TargetIcon, module: "leads" },
  { title: "Quotes", segment: "quotes", icon: FileTextIcon, module: "quotes" },
  { title: "Jobs", segment: "jobs", icon: WrenchIcon, module: "jobs" },
  { title: "Invoices", segment: "invoices", icon: ReceiptTextIcon, module: "invoices" },
];

/** "Setup AI" group — configuring the business and its agents. */
export const navSetup: NavItem[] = [
  {
    title: "Business profile",
    segment: "business-profile",
    icon: Building2Icon,
    crumbChildren: sectionCrumbs,
  },
  { title: "Phone numbers", segment: "phone-numbers", icon: HashIcon },
  { title: "Agents", segment: "agents", icon: BotIcon },
];

/**
 * Pages reachable outside the sidebar (e.g. from the user menu) that still
 * need a breadcrumb title.
 */
const hiddenPages: NavChild[] = [
  {
    title: "Settings",
    segment: "settings",
    crumbChildren: [
      { title: "Profile", segment: "settings/profile" },
      { title: "Calendar", segment: "settings/calendar" },
      { title: "Notifications", segment: "settings/notifications" },
      { title: "Billing", segment: "settings/billing" },
    ],
  },
  // Reached from Billing's "Change plan" (and the no-subscription landing).
  { title: "Plans", segment: "plans" },
];

export function navHref(businessUuid: string, item: NavItem | NavChild): string {
  return item.segment ? `/b/${businessUuid}/${item.segment}` : `/b/${businessUuid}`;
}

export function isNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Breadcrumb trail for the pathname: [item title] or [parent, child]
 * for sub-links. Empty when no nav item owns the path.
 */
export function activeNavTrail(pathname: string, businessUuid: string): string[] {
  for (const item of [...navMain, ...navSetup]) {
    if (!isNavActive(pathname, navHref(businessUuid, item), item.exact)) continue;

    const child = [...(item.children ?? []), ...(item.crumbChildren ?? [])].find((c) =>
      isNavActive(pathname, navHref(businessUuid, c), c.exact)
    );
    return child ? [item.title, child.title] : [item.title];
  }

  const hidden = hiddenPages.find((p) =>
    isNavActive(pathname, navHref(businessUuid, p), p.exact)
  );
  if (hidden) {
    const child = (hidden.crumbChildren ?? []).find((c) =>
      isNavActive(pathname, navHref(businessUuid, c), c.exact)
    );
    return child ? [hidden.title, child.title] : [hidden.title];
  }
  return [];
}
