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
import { useScrollspy } from "@/hooks/use-scrollspy";
import { cn } from "@/lib/utils";

/** Single source of truth for the detail page's sections and their anchors. */
export const AGENT_SECTIONS = [
  { id: "general", title: "General", icon: SlidersHorizontalIcon },
  { id: "voice", title: "Voice", icon: AudioLinesIcon },
  { id: "conversation", title: "Conversation", icon: MessageSquareTextIcon },
  { id: "tools", title: "Tools", icon: WrenchIcon },
  { id: "variables", title: "Variables", icon: BracesIcon },
  { id: "calendar", title: "Calendar", icon: CalendarClockIcon },
  { id: "transfers", title: "Transfers", icon: PhoneForwardedIcon },
  { id: "knowledge", title: "Knowledge", icon: BookOpenIcon },
  { id: "numbers", title: "Numbers", icon: HashIcon },
  { id: "call-summary", title: "Call summaries", icon: MailIcon },
  { id: "danger", title: "Danger zone", icon: TriangleAlertIcon },
] as const;

const SECTION_IDS = AGENT_SECTIONS.map((section) => section.id);

/**
 * Anchor nav for the agent detail page: a quiet sticky rail on desktop
 * (the section-nav recipe) and a sticky scrollable pill row on mobile.
 */
export function AgentJumpNav() {
  const activeId = useScrollspy(SECTION_IDS);

  return (
    <>
      <nav
        aria-label="Agent sections"
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
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <nav
        aria-label="Agent sections"
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
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
