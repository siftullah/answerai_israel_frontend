import {
  BlocksIcon,
  BriefcaseIcon,
  CalendarClockIcon,
  FilesIcon,
  GaugeIcon,
  InfoIcon,
  MessageCircleQuestionIcon,
  PackageIcon,
  PhoneForwardedIcon,
  PlugIcon,
  ScrollTextIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for the Business profile sub-navigation: the
 * SectionNav rail renders from these groups and the main nav-config
 * derives its breadcrumb entries from the flat list, so the two can
 * never disagree.
 *
 * `title` and `label` are message keys under `layout.nav` — renderers
 * translate them with `t(\`nav.${key}\`)`; never show them raw.
 */
export interface SectionItem {
  /** Message key under `layout.nav`. */
  title: string;
  /** Path segment under /b/{uuid}. */
  segment: string;
  icon: LucideIcon;
  /** Match the pathname exactly instead of by prefix (the Overview index). */
  exact?: boolean;
  /** Rendered in the rail only for owner/admin memberships. */
  privileged?: boolean;
}

export interface SectionGroup {
  /** Message key under `layout.nav`; omitted for the ungrouped items at the top (Overview). */
  label?: string;
  items: SectionItem[];
}

export const sectionGroups: SectionGroup[] = [
  {
    items: [
      { title: "overview", segment: "business-profile", icon: GaugeIcon, exact: true },
    ],
  },
  {
    label: "knowledgeBase",
    items: [
      { title: "basicInfo", segment: "business-profile/basic-info", icon: InfoIcon },
      { title: "services", segment: "business-profile/services", icon: BriefcaseIcon },
      { title: "products", segment: "business-profile/products", icon: PackageIcon },
      { title: "faqs", segment: "business-profile/faqs", icon: MessageCircleQuestionIcon },
      { title: "policies", segment: "business-profile/policies", icon: ScrollTextIcon },
      { title: "docs", segment: "business-profile/docs", icon: FilesIcon },
      { title: "integrations", segment: "business-profile/integrations", icon: PlugIcon },
    ],
  },
  {
    label: "operations",
    items: [
      { title: "team", segment: "business-profile/team", icon: UsersRoundIcon },
      { title: "transfers", segment: "business-profile/transfers", icon: PhoneForwardedIcon },
      {
        title: "modules",
        segment: "business-profile/modules",
        icon: BlocksIcon,
        privileged: true,
      },
      { title: "calendar", segment: "business-profile/calendar", icon: CalendarClockIcon },
    ],
  },
];

/**
 * Breadcrumb entries for nav-config: every section except the Overview
 * index, which already reads as plain "Business profile". Privileged
 * sections stay in the list on purpose — a member deep-linking to one still
 * needs a correct trail above the "not available" card.
 */
export const sectionCrumbs: SectionItem[] = sectionGroups
  .flatMap((group) => group.items)
  .filter((item) => !item.exact);
