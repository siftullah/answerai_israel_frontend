import { z } from "zod";
import type { CallSummaryRecipient } from "@/lib/api/types";

export const RECIPIENT_RULES_MAX_RECIPIENTS = 15;
export const RECIPIENT_RULES_MAX_RULES = 20;
export const RECIPIENT_RULES_RULE_MAX_LENGTH = 1000;

/** The on/off switch + recipient pool + rules shape the API stores (call summaries, team notifications). */
export interface RecipientRulesSettings {
  enabled: boolean;
  recipients: CallSummaryRecipient[];
  rules: string[];
}

/**
 * Recipients are split by kind for the UI (checkbox list + chips) and
 * recombined into the API's discriminated list on the way out. Rules are
 * objects so useFieldArray can key the rows.
 */
export const recipientRulesSchema = z
  .object({
    enabled: z.boolean(),
    member_ids: z.array(z.string()),
    custom_emails: z.array(
      z.email({
        error: (issue) =>
          typeof issue.input === "string"
            ? `"${issue.input}" isn't a valid email address`
            : "Enter a valid email address",
      })
    ),
    rules: z
      .array(
        z.object({
          text: z
            .string()
            .max(RECIPIENT_RULES_RULE_MAX_LENGTH, "Keep each rule under 1,000 characters"),
        })
      )
      .max(RECIPIENT_RULES_MAX_RULES, "Up to 20 rules"),
  })
  .superRefine((values, ctx) => {
    const total = values.member_ids.length + values.custom_emails.length;
    if (total > RECIPIENT_RULES_MAX_RECIPIENTS) {
      ctx.addIssue({
        code: "custom",
        path: ["member_ids"],
        message: `Up to ${RECIPIENT_RULES_MAX_RECIPIENTS} recipients in total`,
      });
    }
    if (values.enabled && total === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["member_ids"],
        message: "Pick at least one recipient.",
      });
    }
  });

export type RecipientRulesValues = z.infer<typeof recipientRulesSchema>;

export function toRecipientRulesValues(settings: RecipientRulesSettings): RecipientRulesValues {
  return {
    enabled: settings.enabled,
    member_ids: settings.recipients.flatMap((recipient) =>
      recipient.type === "member" ? [recipient.member_id] : []
    ),
    custom_emails: settings.recipients.flatMap((recipient) =>
      recipient.type === "custom" ? [recipient.email] : []
    ),
    rules: settings.rules.map((text) => ({ text })),
  };
}

/** Blank rule rows are dropped, not rejected — an empty row is just unfinished. */
export function toRecipientRulesPayload(values: RecipientRulesValues): RecipientRulesSettings {
  const recipients: CallSummaryRecipient[] = [
    ...values.member_ids.map((member_id) => ({ type: "member" as const, member_id })),
    ...values.custom_emails.map((email) => ({ type: "custom" as const, email: email.trim() })),
  ];
  return {
    enabled: values.enabled,
    recipients,
    rules: values.rules.map((rule) => rule.text.trim()).filter((text) => text !== ""),
  };
}

/**
 * The backend validates the combined recipients list, so its 422 keys
 * (recipients.1.email, recipients.0.member_id, recipients) don't map 1:1
 * onto the split form fields — land each on the group it belongs to.
 */
export function recipientRulesServerErrorKey(key: string): string {
  if (key === "recipients") return "member_ids";
  if (key.startsWith("recipients.")) {
    return key.endsWith(".email") ? "custom_emails" : "member_ids";
  }
  if (/^rules\.\d+$/.test(key)) return `${key}.text`;
  return key;
}
