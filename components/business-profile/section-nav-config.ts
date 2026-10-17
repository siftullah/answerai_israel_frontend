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
 */
export interface SectionItem {
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
  /** Omitted for the ungrouped items at the top (Overview). */
  label?: string;
  items: SectionItem[];
}

export const sectionGroups: SectionGroup[] = [
  {
    items: [
      { title: "Overview", segment: "business-profile", icon: GaugeIcon, exact: true },
    ],
  },
  {
    label: "Knowledge base",
    items: [
      { title: "Basic info", segment: "business-profile/basic-info", icon: InfoIcon },
      { title: "Services", segment: "business-profile/services", icon: BriefcaseIcon },
      { title: "Products", segment: "business-profile/products", icon: PackageIcon },
      { title: "FAQs", segment: "business-profile/faqs", icon: MessageCircleQuestionIcon },
      { title: "Policies", segment: "business-profile/policies", icon: ScrollTextIcon },
      { title: "Docs", segment: "business-profile/docs", icon: FilesIcon },
      { title: "Integrations", segment: "business-profile/integrations", icon: PlugIcon },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Team", segment: "business-profile/team", icon: UsersRoundIcon },
      { title: "Transfers", segment: "business-profile/transfers", icon: PhoneForwardedIcon },
      {
        title: "Modules",
        segment: "business-profile/modules",
        icon: BlocksIcon,
        privileged: true,
      },
      { title: "Calendar", segment: "business-profile/calendar", icon: CalendarClockIcon },
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
