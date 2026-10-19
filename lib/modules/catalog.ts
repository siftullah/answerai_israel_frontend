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
import { rt } from "@/lib/i18n/runtime";

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
 * `label`/`description` are getters so they read in the active UI language.
 */
export const MODULE_CATALOG: Record<ModuleKey, ModuleInfo> = {
  appointments: {
    get label() {
      return rt("lib.modules.appointments.label");
    },
    get description() {
      return rt("lib.modules.appointments.description");
    },
    icon: CalendarDaysIcon,
  },
  leads: {
    get label() {
      return rt("lib.modules.leads.label");
    },
    get description() {
      return rt("lib.modules.leads.description");
    },
    icon: TargetIcon,
  },
  quotes: {
    get label() {
      return rt("lib.modules.quotes.label");
    },
    get description() {
      return rt("lib.modules.quotes.description");
    },
    icon: FileTextIcon,
  },
  jobs: {
    get label() {
      return rt("lib.modules.jobs.label");
    },
    get description() {
      return rt("lib.modules.jobs.description");
    },
    icon: WrenchIcon,
  },
  invoices: {
    get label() {
      return rt("lib.modules.invoices.label");
    },
    get description() {
      return rt("lib.modules.invoices.description");
    },
    icon: ReceiptTextIcon,
  },
  callbacks: {
    get label() {
      return rt("lib.modules.callbacks.label");
    },
    get description() {
      return rt("lib.modules.callbacks.description");
    },
    icon: PhoneCallIcon,
  },
};
