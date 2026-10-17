import { z } from "zod";
import type {
  Agent,
  AgentCalendarOverrides,
  AgentConfig,
  AgentTemplate,
  CreateAgentPayload,
  UpdateAgentPayload,
} from "@/lib/api/types";
import { AGENT_TEMPLATES, OVERRIDABLE_BUILTIN_VARIABLES } from "@/lib/api/types";

/** Platform-injected per-call variables — valid in prompts, never redeclarable. */
export const BUILTIN_VARIABLES = [
  "business_name",
  "agent_name",
  "contact_name",
  "contact_email",
  "contact_company",
  "contact_address",
  "caller_number",
  "now_local",
  "business_hours_today",
  "business_hours_note",
] as const;

/** Builtins plus internal plumbing names (not valid as prompt placeholders either). */
export const RESERVED_VARIABLE_NAMES: readonly string[] = [...BUILTIN_VARIABLES, "call_sid"];

/** Mirrors the backend's placeholder scanner exactly. */
export const VARIABLE_TOKEN_REGEX = /\{\{\s*([a-z0-9_]+)\s*\}\}/g;

const TEMPLATE_VALUES = AGENT_TEMPLATES.map((t) => t.value) as [
  AgentTemplate,
  ...AgentTemplate[],
];

export const createAgentSchema = z.object({
  template: z.enum(TEMPLATE_VALUES),
  name: z.string().min(1, "Name is required").max(255),
  purpose: z.enum(["inbound", "outbound"]),
});

export type CreateAgentValues = z.infer<typeof createAgentSchema>;

export function toCreateAgentPayload(values: CreateAgentValues): CreateAgentPayload {
  return {
    name: values.name.trim(),
    // Explicit purpose wins over the template's default server-side.
    purpose: values.purpose,
    ...(values.template !== "blank" ? { template: values.template } : {}),
  };
}

const dynamicVariableSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z0-9_]{1,40}$/, "Lowercase letters, digits and underscores only (max 40)")
    .refine((name) => !RESERVED_VARIABLE_NAMES.includes(name), "This variable name is reserved"),
  /** "" = no default. */
  default_value: z.string(),
});

/**
 * Calendar overrides as the inputs hold them: strings, "" = inherit. The
 * bookings cap needs a third state (explicitly uncapped), hence the
 * UI-only max_bookings_mode discriminator.
 */
const calendarFieldsSchema = z.object({
  slot_interval_minutes: z.string(),
  min_notice_minutes: z.string(),
  max_horizon_days: z.string(),
  buffer_minutes: z.string(),
  max_bookings_mode: z.enum(["inherit", "no_cap", "custom"]),
  max_bookings_per_day: z.string(),
  appointment_duration_minutes: z.string(),
  callback_duration_minutes: z.string(),
});

const CALENDAR_RANGES: ReadonlyArray<
  [keyof z.infer<typeof calendarFieldsSchema> & string, number, number, string]
> = [
  ["min_notice_minutes", 0, 10080, "Between 0 and 10,080 minutes"],
  ["max_horizon_days", 1, 365, "Between 1 and 365 days"],
  ["buffer_minutes", 0, 240, "Between 0 and 240 minutes"],
  ["appointment_duration_minutes", 5, 1440, "Between 5 and 1,440 minutes"],
  ["callback_duration_minutes", 5, 240, "Between 5 and 240 minutes"],
];

export const agentSettingsSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255),
    description: z.string().max(500, "Keep the description under 500 characters"),
    purpose: z.enum(["inbound", "outbound"]),
    voice_id: z.string().min(1, "Pick a voice — the agent can't take calls without one."),
    first_message: z.string().max(1000, "Keep the first message under 1,000 characters"),
    prompt_text: z.string().max(30000, "Keep the prompt under 30,000 characters"),
    rag_enabled: z.boolean(),
    action_tools: z.array(z.string()),
    dynamic_variables: z.array(dynamicVariableSchema).max(30, "Up to 30 variables"),
    overridable_builtins: z.array(z.string()),
    calendar: calendarFieldsSchema,
  })
  .superRefine((values, ctx) => {
    const seen = new Set<string>();
    values.dynamic_variables.forEach((variable, index) => {
      if (seen.has(variable.name)) {
        ctx.addIssue({
          code: "custom",
          path: ["dynamic_variables", index, "name"],
          message: "Duplicate variable name",
        });
      }
      seen.add(variable.name);
    });

    const known = new Set<string>([
      ...BUILTIN_VARIABLES,
      ...values.dynamic_variables.map((variable) => variable.name),
    ]);
    for (const field of ["first_message", "prompt_text"] as const) {
      for (const match of values[field].matchAll(VARIABLE_TOKEN_REGEX)) {
        const token = match[1];
        if (token && !known.has(token)) {
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: `Unknown variable {{${token}}} — declare it under Variables or use a built-in.`,
          });
          break;
        }
      }
    }

    const checkRange = (raw: string, min: number, max: number): boolean => {
      const value = Number(raw);
      return Number.isInteger(value) && value >= min && value <= max;
    };
    for (const [key, min, max, message] of CALENDAR_RANGES) {
      const raw = values.calendar[key];
      if (typeof raw === "string" && raw !== "" && !checkRange(raw, min, max)) {
        ctx.addIssue({ code: "custom", path: ["calendar", key], message });
      }
    }
    if (
      values.calendar.max_bookings_mode === "custom" &&
      !checkRange(values.calendar.max_bookings_per_day, 1, 100)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["calendar", "max_bookings_per_day"],
        message: "Between 1 and 100 bookings",
      });
    }
  });

export type AgentSettingsValues = z.infer<typeof agentSettingsSchema>;

function numberToField(value: number | undefined): string {
  return typeof value === "number" ? String(value) : "";
}

export function toAgentSettingsValues(agent: Agent): AgentSettingsValues {
  const config: Partial<AgentConfig> = agent.config ?? {};
  const overrides = config.calendar_overrides ?? {};
  const bookings = overrides.max_bookings_per_day;

  return {
    name: agent.name,
    description: agent.description ?? "",
    purpose: agent.purpose === "outbound" ? "outbound" : "inbound",
    voice_id: config.voice_id ?? "",
    first_message: config.first_message ?? "",
    prompt_text: config.prompt_text ?? "",
    rag_enabled: config.rag_enabled ?? true,
    action_tools: config.action_tools ?? [],
    dynamic_variables: (config.dynamic_variables ?? []).map((variable) => ({
      name: variable.name,
      default_value: variable.default_value ?? "",
    })),
    overridable_builtins: (config.overridable_builtins ?? []).filter((name) =>
      (OVERRIDABLE_BUILTIN_VARIABLES as readonly string[]).includes(name)
    ),
    calendar: {
      slot_interval_minutes: numberToField(overrides.slot_interval_minutes),
      min_notice_minutes: numberToField(overrides.min_notice_minutes),
      max_horizon_days: numberToField(overrides.max_horizon_days),
      buffer_minutes: numberToField(overrides.buffer_minutes),
      max_bookings_mode: bookings === undefined ? "inherit" : bookings === null ? "no_cap" : "custom",
      max_bookings_per_day: typeof bookings === "number" ? String(bookings) : "",
      appointment_duration_minutes: numberToField(overrides.appointment_duration_minutes),
      callback_duration_minutes: numberToField(overrides.callback_duration_minutes),
    },
  };
}

/**
 * Full-config PATCH body. The backend replaces config keys wholesale
 * (top-level array_replace), so every key we own is always present —
 * an omitted key would silently keep its old value. Exceptions: voice_id
 * (backend rejects null — omitted while unset) and calendar keys left on
 * inherit (sparse by design; sending {} clears all overrides).
 */
export function toUpdateAgentPayload(
  values: AgentSettingsValues,
  options: { allowedTools: ReadonlySet<string> }
): UpdateAgentPayload {
  const calendar: AgentCalendarOverrides = {};
  const putNumber = (key: keyof AgentCalendarOverrides, raw: string): void => {
    if (raw !== "") calendar[key] = Number(raw);
  };
  putNumber("slot_interval_minutes", values.calendar.slot_interval_minutes);
  putNumber("min_notice_minutes", values.calendar.min_notice_minutes);
  putNumber("max_horizon_days", values.calendar.max_horizon_days);
  putNumber("buffer_minutes", values.calendar.buffer_minutes);
  putNumber("appointment_duration_minutes", values.calendar.appointment_duration_minutes);
  putNumber("callback_duration_minutes", values.calendar.callback_duration_minutes);
  if (values.calendar.max_bookings_mode === "no_cap") {
    calendar.max_bookings_per_day = null;
  } else if (values.calendar.max_bookings_mode === "custom") {
    putNumber("max_bookings_per_day", values.calendar.max_bookings_per_day);
  }

  return {
    name: values.name.trim(),
    description: values.description.trim() === "" ? null : values.description.trim(),
    purpose: values.purpose,
    config: {
      ...(values.voice_id !== "" ? { voice_id: values.voice_id } : {}),
      first_message: values.first_message,
      prompt_text: values.prompt_text,
      rag_enabled: values.rag_enabled,
      // Module-gated tools 422 while their module is off — strip them.
      action_tools: values.action_tools.filter((tool) => options.allowedTools.has(tool)),
      dynamic_variables: values.dynamic_variables.map((variable) => ({
        name: variable.name,
        default_value: variable.default_value.trim() === "" ? null : variable.default_value,
      })),
      overridable_builtins: values.overridable_builtins,
      calendar_overrides: calendar,
    },
  };
}

/** A value supplied per call: a custom variable, or a built-in the agent marks overridable. */
export interface AgentCallVariable {
  name: string;
  /** Prefill for the place-call dialog; built-ins prefill from the contact instead. */
  default_value: string | null;
  builtin: boolean;
}

/**
 * Everything a caller or a campaign row must supply for this agent: its overridable
 * built-ins first, then its custom variables. The backend requires a value for each.
 */
export function agentCallVariables(config: AgentConfig | null | undefined): AgentCallVariable[] {
  const overridable = (config?.overridable_builtins ?? []).filter((name) =>
    (OVERRIDABLE_BUILTIN_VARIABLES as readonly string[]).includes(name)
  );
  return [
    ...overridable.map((name) => ({ name, default_value: null, builtin: true })),
    ...(config?.dynamic_variables ?? []).map((variable) => ({
      name: variable.name,
      default_value: variable.default_value,
      builtin: false,
    })),
  ];
}

/**
 * The backend's 422 bag uses payload keys (config.prompt_text,
 * config.dynamic_variables.2.name, …) — remap them onto the form's shape
 * before the shared helper attaches them.
 */
export function agentServerErrorKey(key: string): string {
  const stripped = key.startsWith("config.") ? key.slice("config.".length) : key;
  if (stripped === "action_tools" || stripped.startsWith("action_tools.")) {
    return "action_tools";
  }
  if (stripped.startsWith("calendar_overrides.")) {
    return `calendar.${stripped.slice("calendar_overrides.".length)}`;
  }
  return stripped;
}
