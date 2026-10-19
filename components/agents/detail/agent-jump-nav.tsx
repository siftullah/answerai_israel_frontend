"use client";

import {
  AudioLinesIcon,
  BookOpenIcon,
  BracesIcon,
  CalendarClockIcon,
  HashIcon,
  MailIcon,
  MessageSquareTextIcon,
  PhoneForwardedIcon,
  SlidersHorizontalIcon,
  TriangleAlertIcon,
  WrenchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useScrollspy } from "@/hooks/use-scrollspy";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for the detail page's sections and their anchors.
 * `titleKey` is the nav label's key under `agents.sections`.
 */
export const AGENT_SECTIONS = [
  { id: "general", titleKey: "general.title", icon: SlidersHorizontalIcon },
  { id: "voice", titleKey: "voice.title", icon: AudioLinesIcon },
  { id: "conversation", titleKey: "conversation.title", icon: MessageSquareTextIcon },
  { id: "tools", titleKey: "tools.title", icon: WrenchIcon },
  { id: "variables", titleKey: "variables.title", icon: BracesIcon },
  { id: "calendar", titleKey: "calendar.title", icon: CalendarClockIcon },
  { id: "transfers", titleKey: "transfers.title", icon: PhoneForwardedIcon },
  { id: "knowledge", titleKey: "knowledge.title", icon: BookOpenIcon },
  { id: "numbers", titleKey: "numbers.title", icon: HashIcon },
  { id: "call-summary", titleKey: "callSummary.navTitle", icon: MailIcon },
  { id: "danger", titleKey: "danger.title", icon: TriangleAlertIcon },
] as const;

const SECTION_IDS = AGENT_SECTIONS.map((section) => section.id);

/**
 * Anchor nav for the agent detail page: a quiet sticky rail on desktop
 * (the section-nav recipe) and a sticky scrollable pill row on mobile.
 */
export function AgentJumpNav() {
  const activeId = useScrollspy(SECTION_IDS);
  const t = useTranslations("agents.sections");
  const td = useTranslations("agents.detail");

  return (
    <>
      <nav
        aria-label={td("sectionsNav")}
        className="sticky top-0 z-10 -mx-4 bg-background px-4 py-2 sm:-mx-6 sm:px-6 lg:hidden"
      >
        <ul className="flex gap-1.5 overflow-x-auto pb-1">
          {AGENT_SECTIONS.map((section) => (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                aria-current={activeId === section.id ? "location" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap",
                  activeId === section.id
                    ? "border-transparent bg-primary/10 font-medium text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <section.icon className="size-4 shrink-0" />
                {t(section.titleKey)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <nav
        aria-label={td("sectionsNav")}
        className="hidden w-52 shrink-0 lg:sticky lg:top-6 lg:block lg:self-start"
      >
        <ul className="flex flex-col gap-0.5">
          {AGENT_SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={activeId === section.id ? "location" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm",
                  activeId === section.id
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <section.icon className="size-4 shrink-0" />
                {t(section.titleKey)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
