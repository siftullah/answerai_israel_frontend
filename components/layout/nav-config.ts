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
 *
 * `title` is a message key under `layout.nav` — renderers translate it with
 * `t(\`nav.${item.title}\`)`; never show it raw.
 */
export interface NavChild {
  /** Message key under `layout.nav`. */
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
  /** Message key under `layout.nav`. */
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
  { title: "dashboard", segment: "", icon: LayoutDashboardIcon, exact: true },
  {
    title: "contacts",
    segment: "contacts",
    icon: UsersIcon,
    children: [
      { title: "allContacts", segment: "contacts", exact: true },
      { title: "dnc", segment: "contacts/dnc" },
    ],
  },
  {
    title: "calls",
    segment: "calls",
    icon: PhoneIcon,
    children: [
      { title: "inboundLogs", segment: "calls/inbound-logs" },
      { title: "outboundLogs", segment: "calls/outbound-logs" },
      { title: "callbacks", segment: "calls/callbacks", module: "callbacks" },
      { title: "campaigns", segment: "calls/campaigns" },
    ],
  },
  { title: "calendar", segment: "calendar", icon: CalendarIcon },
  { title: "appointments", segment: "appointments", icon: CalendarDaysIcon, module: "appointments" },
  { title: "leads", segment: "leads", icon: TargetIcon, module: "leads" },
  { title: "quotes", segment: "quotes", icon: FileTextIcon, module: "quotes" },
  { title: "jobs", segment: "jobs", icon: WrenchIcon, module: "jobs" },
  { title: "invoices", segment: "invoices", icon: ReceiptTextIcon, module: "invoices" },
];

/** "Setup AI" group — configuring the business and its agents. */
export const navSetup: NavItem[] = [
  {
    title: "businessProfile",
    segment: "business-profile",
    icon: Building2Icon,
    crumbChildren: sectionCrumbs,
  },
  { title: "phoneNumbers", segment: "phone-numbers", icon: HashIcon },
  { title: "agents", segment: "agents", icon: BotIcon },
];

/**
 * Pages reachable outside the sidebar (e.g. from the user menu) that still
 * need a breadcrumb title.
 */
const hiddenPages: NavChild[] = [
  {
    title: "settings",
    segment: "settings",
    crumbChildren: [
      { title: "profile", segment: "settings/profile" },
      { title: "calendar", segment: "settings/calendar" },
      { title: "notifications", segment: "settings/notifications" },
      { title: "billing", segment: "settings/billing" },
    ],
  },
  // Reached from Billing's "Change plan" (and the no-subscription landing).
  { title: "plans", segment: "plans" },
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
 * for sub-links. Empty when no nav item owns the path. Entries are
 * `layout.nav` message keys — the caller translates them.
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
