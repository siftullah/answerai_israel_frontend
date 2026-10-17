import {
  CalendarDaysIcon,
  FileTextIcon,
  PhoneCallIcon,
  ReceiptTextIcon,
  TargetIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import type { ModuleKey } from "@/lib/api/types";

export interface ModuleInfo {
  label: string;
  /** Plain-English "what turning this on gives you". */
  description: string;
  /** Mirrors the module's sidebar icon so the cards read as the same thing. */
  icon: LucideIcon;
}

/**
 * Presentation copy for the industry modules — the single source for module
 * labels across the portal (the agent tool catalog reads its group labels
 * from here). Enablement itself comes from the API; this only describes it.
 */
export const MODULE_CATALOG: Record<ModuleKey, ModuleInfo> = {
  appointments: {
    label: "Appointments",
    description:
      "Let your AI check the calendar and book callers into open slots, then manage those bookings.",
    icon: CalendarDaysIcon,
  },
  leads: {
    label: "Leads",
    description:
      "Capture sales enquiries from calls as leads your team can follow up later.",
    icon: TargetIcon,
  },
  quotes: {
    label: "Quotes",
    description:
      "Price up work, send quotes customers accept online, and log quote requests from calls.",
    icon: FileTextIcon,
  },
  jobs: {
    label: "Jobs",
    description:
      "Log on-site work your AI takes over the phone and schedule the visit.",
    icon: WrenchIcon,
  },
  invoices: {
    label: "Invoices",
    description: "Raise invoices for completed work and track what's been paid.",
    icon: ReceiptTextIcon,
  },
  callbacks: {
    label: "Callbacks",
    description:
      "Schedule a return call when your AI can't help the caller on the spot.",
    icon: PhoneCallIcon,
  },
};
