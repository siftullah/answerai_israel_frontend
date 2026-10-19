import { z } from "zod";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import type { ApiError } from "@/lib/api/errors";
import type {
  CallbackType,
  CompleteCallbackPayload,
  StoreCallbackPayload,
  UpdateCallbackPayload,
} from "@/lib/api/types";
import { CALLBACK_OUTCOMES, CALLBACK_TYPES } from "@/lib/api/types";
import { zonedDateTimeToUtcIso } from "@/lib/datetime";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import type { Translator } from "@/lib/i18n/types";

/**
 * Loose mirrors — the backend's CallbackService is the validation authority
 * (calling hours, calendar-busy, destination allowlist…). Its 422s carry a
 * machine `reason` and no field bag; applyCallbackServerErrors maps them.
 * Schema factories take a translator scoped to the `validation` namespace.
 */
export function createCallbackSchema(t: Translator) {
  return z
    .object({
      type: z.enum(CALLBACK_TYPES),
      contact_id: z.string().min(1, t("common.contactRequired")),
      date: z.string().min(1, t("common.dateRequired")),
      time: z.string().min(1, t("common.timeRequired")),
      topic: z.string().max(300, t("length.topic", { max: 300 })),
      notes: z.string().max(5000, t("length.notes", { max: 5000 })),
      assignee_user_id: z.string(),
      agent_id: z.string(),
      caller_phone_number_id: z.string(),
      /** Kept as select strings; "" = backend defaults (2 attempts, 30 min). */
      max_attempts: z.string(),
      retry_delay_minutes: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.type === "team_member" && !values.assignee_user_id) {
        ctx.addIssue({
          code: "custom",
          path: ["assignee_user_id"],
          message: t("callback.teamMemberRequired"),
        });
      }
      if (values.type === "agent" && !values.agent_id) {
        ctx.addIssue({
          code: "custom",
          path: ["agent_id"],
          message: t("callback.outboundAgentRequired"),
        });
      }
      if (values.type === "agent" && !values.caller_phone_number_id) {
        ctx.addIssue({
          code: "custom",
          path: ["caller_phone_number_id"],
          message: t("common.fromNumberRequired"),
        });
      }
    });
}

export type CreateCallbackValues = z.infer<ReturnType<typeof createCallbackSchema>>;

export function defaultCreateCallbackValues(
  overrides: Partial<CreateCallbackValues> = {}
): CreateCallbackValues {
  return {
    type: "team_member",
    contact_id: "",
    date: "",
    time: "",
    topic: "",
    notes: "",
    assignee_user_id: "",
    agent_id: "",
    caller_phone_number_id: "",
    max_attempts: "",
    retry_delay_minutes: "",
    ...overrides,
  };
}

export function toStoreCallbackPayload(
  values: CreateCallbackValues,
  timeZone: string
): StoreCallbackPayload {
  const topic = values.topic.trim();
  const notes = values.notes.trim();
  return {
    type: values.type,
    contact_id: values.contact_id,
    scheduled_at: zonedDateTimeToUtcIso(values.date, values.time, timeZone),
    timezone: timeZone,
    ...(topic ? { topic } : {}),
    ...(notes ? { notes } : {}),
    ...(values.type === "agent"
      ? {
          agent_id: values.agent_id,
          caller_phone_number_id: values.caller_phone_number_id,
          ...(values.max_attempts ? { max_attempts: Number(values.max_attempts) } : {}),
          ...(values.retry_delay_minutes
            ? { retry_delay_minutes: Number(values.retry_delay_minutes) }
            : {}),
        }
      : { assignee_user_id: values.assignee_user_id }),
  };
}

export function rescheduleCallbackSchema(t: Translator) {
  return z.object({
    date: z.string().min(1, t("common.dateRequired")),
    time: z.string().min(1, t("common.timeRequired")),
  });
}

export type RescheduleCallbackValues = z.infer<ReturnType<typeof rescheduleCallbackSchema>>;

export function toReschedulePayload(
  values: RescheduleCallbackValues,
  timeZone: string
): { scheduled_at: string } {
  return { scheduled_at: zonedDateTimeToUtcIso(values.date, values.time, timeZone) };
}

export function editCallbackSchema(t: Translator) {
  return z.object({
    topic: z.string().max(300, t("length.topic", { max: 300 })),
    notes: z.string().max(5000, t("length.notes", { max: 5000 })),
    assignee_user_id: z.string(),
    agent_id: z.string(),
  });
}

export type EditCallbackValues = z.infer<ReturnType<typeof editCallbackSchema>>;

/** Sends only the reassign key the type accepts — the other 422s as not applicable. */
export function toUpdateCallbackPayload(
  values: EditCallbackValues,
  type: CallbackType
): UpdateCallbackPayload {
  return {
    topic: values.topic.trim() || null,
    notes: values.notes.trim() || null,
    ...(type === "agent"
      ? values.agent_id
        ? { agent_id: values.agent_id }
        : {}
      : values.assignee_user_id
        ? { assignee_user_id: values.assignee_user_id }
        : {}),
  };
}

export function completeCallbackSchema(t: Translator) {
  return z.object({
    outcome: z.enum(CALLBACK_OUTCOMES),
    notes: z.string().max(5000, t("length.notes", { max: 5000 })),
  });
}

export type CompleteCallbackValues = z.infer<ReturnType<typeof completeCallbackSchema>>;

export function defaultCompleteCallbackValues(notes: string | null): CompleteCallbackValues {
  return { outcome: "handled", notes: notes ?? "" };
}

export function toCompleteCallbackPayload(values: CompleteCallbackValues): CompleteCallbackPayload {
  const notes = values.notes.trim();
  return { outcome: values.outcome, ...(notes ? { notes } : {}) };
}

/** Machine reason → the form field the message belongs under. */
const CALLBACK_REASON_FIELDS: Record<string, string> = {
  callback_no_phone: "contact_id",
  callback_agent_not_outbound: "agent_id",
  callback_no_number: "caller_phone_number_id",
  callback_number_not_dialable: "caller_phone_number_id",
  callback_assignee_not_member: "assignee_user_id",
  callback_outside_calling_hours: "time",
  callback_time_busy: "time",
};

/**
 * Callback-service 422s are `{message, reason}` with no field bag — route the
 * message onto the field its reason implicates, falling back to the standard
 * handler (root.server alert) for everything else.
 */
export function applyCallbackServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: ApiError
): void {
  const field = error.reason ? CALLBACK_REASON_FIELDS[error.reason] : undefined;
  if (error.status === 422 && field && field in form.getValues()) {
    form.setError(field as Path<T>, { type: "server", message: error.message });
    return;
  }
  applyServerErrors(form, error);
}
