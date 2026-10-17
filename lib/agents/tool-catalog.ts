import type { BusinessModule, ModuleKey } from "@/lib/api/types";
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
 */
export const TOOL_LABELS: Record<string, { label: string; description: string }> = {
  lookup_contact: {
    label: "Look up caller",
    description: "Check whether the caller is a known contact and greet them by name.",
  },
  save_contact_info: {
    label: "Save contact info",
    description: "Save the caller's name, email, or company to their contact record.",
  },
  add_to_dnc: {
    label: "Do-not-call requests",
    description: "Add the caller to the do-not-call list when they ask.",
  },
  get_current_time: {
    label: "Current time",
    description: "Tell the time and whether the business is open right now.",
  },
  get_call_history: {
    label: "Call history",
    description: "Recall the caller's previous calls with any of your agents, with notes and transcripts.",
  },
  schedule_callback: {
    label: "Schedule callback",
    description: "Book a future call back to the caller at a time they request.",
  },
  check_availability: {
    label: "Check availability",
    description: "Find open appointment slots on the calendar.",
  },
  book_appointment: {
    label: "Book appointment",
    description: "Book the caller into an open appointment slot.",
  },
  cancel_appointment: {
    label: "Cancel appointment",
    description: "Cancel an existing appointment for the caller.",
  },
  create_lead: {
    label: "Create lead",
    description: "Record a new sales lead from the conversation.",
  },
  request_quote: {
    label: "Request quote",
    description: "Log a quote request for work the caller wants priced; the team quotes it afterwards.",
  },
  create_job: {
    label: "Create job",
    description: "Log a new job request from the caller.",
  },
  check_job_availability: {
    label: "Check job availability",
    description: "Find open slots for scheduling a job visit.",
  },
  book_job: {
    label: "Book job",
    description: "Book a job visit into an open slot.",
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
    { key: "core", label: "Core", enabled: true, tools: [...CORE_TOOLS] },
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
