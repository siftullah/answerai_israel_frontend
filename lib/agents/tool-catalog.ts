import type { BusinessModule, ModuleKey } from "@/lib/api/types";
import { rt } from "@/lib/i18n/runtime";
import { MODULE_CATALOG } from "@/lib/modules/catalog";

/** Always-available tools — not gated behind any module. */
export const CORE_TOOLS: readonly string[] = [
  "lookup_contact",
  "save_contact_info",
  "add_to_dnc",
  "get_current_time",
  "get_call_history",
];

/**
 * Display copy per tenant-selectable tool. Keys mirror the backend
 * config/agent-tools.php catalog; unknown keys fall back to a prettified
 * slug so new backend tools render before this map learns about them.
 * `label`/`description` are getters so they read in the active UI language.
 */
export const TOOL_LABELS: Record<string, { label: string; description: string }> = {
  lookup_contact: {
    get label() {
      return rt("lib.tools.lookup_contact.label");
    },
    get description() {
      return rt("lib.tools.lookup_contact.description");
    },
  },
  save_contact_info: {
    get label() {
      return rt("lib.tools.save_contact_info.label");
    },
    get description() {
      return rt("lib.tools.save_contact_info.description");
    },
  },
  add_to_dnc: {
    get label() {
      return rt("lib.tools.add_to_dnc.label");
    },
    get description() {
      return rt("lib.tools.add_to_dnc.description");
    },
  },
  get_current_time: {
    get label() {
      return rt("lib.tools.get_current_time.label");
    },
    get description() {
      return rt("lib.tools.get_current_time.description");
    },
  },
  get_call_history: {
    get label() {
      return rt("lib.tools.get_call_history.label");
    },
    get description() {
      return rt("lib.tools.get_call_history.description");
    },
  },
  schedule_callback: {
    get label() {
      return rt("lib.tools.schedule_callback.label");
    },
    get description() {
      return rt("lib.tools.schedule_callback.description");
    },
  },
  check_availability: {
    get label() {
      return rt("lib.tools.check_availability.label");
    },
    get description() {
      return rt("lib.tools.check_availability.description");
    },
  },
  book_appointment: {
    get label() {
      return rt("lib.tools.book_appointment.label");
    },
    get description() {
      return rt("lib.tools.book_appointment.description");
    },
  },
  cancel_appointment: {
    get label() {
      return rt("lib.tools.cancel_appointment.label");
    },
    get description() {
      return rt("lib.tools.cancel_appointment.description");
    },
  },
  create_lead: {
    get label() {
      return rt("lib.tools.create_lead.label");
    },
    get description() {
      return rt("lib.tools.create_lead.description");
    },
  },
  request_quote: {
    get label() {
      return rt("lib.tools.request_quote.label");
    },
    get description() {
      return rt("lib.tools.request_quote.description");
    },
  },
  create_job: {
    get label() {
      return rt("lib.tools.create_job.label");
    },
    get description() {
      return rt("lib.tools.create_job.description");
    },
  },
  check_job_availability: {
    get label() {
      return rt("lib.tools.check_job_availability.label");
    },
    get description() {
      return rt("lib.tools.check_job_availability.description");
    },
  },
  book_job: {
    get label() {
      return rt("lib.tools.book_job.label");
    },
    get description() {
      return rt("lib.tools.book_job.description");
    },
  },
};

export interface ToolGroup {
  key: "core" | ModuleKey;
  label: string;
  enabled: boolean;
  tools: string[];
}

export function toolLabel(tool: string): { label: string; description: string } {
  return (
    TOOL_LABELS[tool] ?? {
      label: tool.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase()),
      description: "",
    }
  );
}

/** Checkbox groups for the Tools section: core first, then each module that contributes tools. */
export function toolGroups(modules: BusinessModule[]): ToolGroup[] {
  return [
    { key: "core", label: rt("lib.toolGroups.core"), enabled: true, tools: [...CORE_TOOLS] },
    ...modules
      .filter((module) => module.tools.length > 0)
      .map((module) => ({
        key: module.key,
        label: MODULE_CATALOG[module.key]?.label ?? module.key,
        enabled: module.enabled,
        tools: module.tools,
      })),
  ];
}

/**
 * Tool keys the backend will accept right now (module-gated tools 422 while
 * their module is disabled) — the save payload is filtered through this.
 */
export function enabledToolKeys(modules: BusinessModule[]): Set<string> {
  return new Set([
    ...CORE_TOOLS,
    ...modules.filter((module) => module.enabled).flatMap((module) => module.tools),
  ]);
}
