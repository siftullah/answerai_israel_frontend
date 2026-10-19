"use client";

import { useTranslations } from "next-intl";
import { Controller, useFieldArray, type UseFormReturn } from "react-hook-form";
import type { UseQueryResult } from "@tanstack/react-query";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChipInput } from "@/components/ui/chip-input";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ApiError } from "@/lib/api/errors";
import type { BusinessMember } from "@/lib/api/types";
import {
  RECIPIENT_RULES_MAX_RECIPIENTS,
  RECIPIENT_RULES_MAX_RULES,
  RECIPIENT_RULES_RULE_MAX_LENGTH,
  type RecipientRulesValues,
} from "@/lib/validation/recipient-rules";
import { cn } from "@/lib/utils";

/** The wording that differs between the features sharing this form. */
export interface RecipientRulesCopy {
  enabledLabel: string;
  enabledDescription: string;
  recipientsTitle: string;
  recipientsDescription: string;
  customEmailsDescription: string;
  rulesTitle: string;
  rulesDescription: string;
  rulesEmpty: string;
  /** Cycled through empty rule rows so each new row suggests something different. */
  rulePlaceholders: string[];
  rulesLimitNote: string;
}

/** Array-level message (server bag or count rule) or the first per-item one. */
function arrayError(error: unknown): string | undefined {
  const candidate = error as
    | { message?: string; root?: { message?: string } }
    | Array<{ message?: string } | undefined>
    | undefined;
  if (!candidate) return undefined;
  if (Array.isArray(candidate)) return candidate.find((item) => item?.message)?.message;
  return candidate.root?.message ?? candidate.message;
}

/**
 * The on/off switch, team-member checklist, extra-address chips and rule rows
 * shared by every "an assistant picks who gets this" setting — call summaries
 * per agent, team notifications per business. The owning form supplies the
 * react-hook-form instance and the surrounding card, save bar and sample button.
 */
export function RecipientRulesFields({
  form,
  idPrefix,
  membersQuery,
  copy,
}: {
  form: UseFormReturn<RecipientRulesValues>;
  idPrefix: string;
  membersQuery: UseQueryResult<BusinessMember[], ApiError>;
  copy: RecipientRulesCopy;
}) {
  const t = useTranslations("settings.recipientRules");
  const { errors, disabled } = form.formState;
  const enabled = form.watch("enabled");
  const memberIds = form.watch("member_ids");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "rules" });

  const members = membersQuery.data ?? [];
  const memberError = arrayError(errors.member_ids);
  const customEmailError = arrayError(errors.custom_emails);
  const rulesError = arrayError(errors.rules);

  return (
    <>
      <Field data-invalid={!!errors.enabled || undefined}>
        <div className="flex items-center gap-3">
          <Controller
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <Switch
                id={`${idPrefix}-enabled`}
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={disabled}
              />
            )}
          />
          <FieldLabel htmlFor={`${idPrefix}-enabled`} className="font-normal">
            {copy.enabledLabel}
          </FieldLabel>
        </div>
        <FieldDescription>{copy.enabledDescription}</FieldDescription>
        {errors.enabled && <FieldError>{errors.enabled.message}</FieldError>}
      </Field>

      <div className={cn("flex flex-col gap-5", !enabled && "opacity-60")}>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">{copy.recipientsTitle}</p>
            <p className="text-sm text-muted-foreground">{copy.recipientsDescription}</p>
          </div>
          <Controller
            control={form.control}
            name="member_ids"
            render={({ field }) => (
              <div
                className={cn(
                  "flex flex-col rounded-2xl border",
                  memberError && "border-destructive"
                )}
              >
                {membersQuery.isPending ? (
                  <div className="flex flex-col gap-2 p-3">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ) : membersQuery.isError ? (
                  <p className="px-3 py-3 text-sm text-muted-foreground">
                    {t("membersLoadError")}
                  </p>
                ) : members.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-muted-foreground">{t("noMembers")}</p>
                ) : (
                  members.map((member, index) => {
                    const noEmail = member.email === null;
                    const rowDisabled = disabled || noEmail;
                    return (
                      <label
                        key={member.id}
                        htmlFor={`${idPrefix}-member-${member.id}`}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2.5",
                          index > 0 && "border-t",
                          rowDisabled
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:bg-muted/40"
                        )}
                      >
                        <Checkbox
                          id={`${idPrefix}-member-${member.id}`}
                          disabled={rowDisabled}
                          checked={field.value.includes(member.id)}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked
                                ? [...field.value, member.id]
                                : field.value.filter((id) => id !== member.id)
                            )
                          }
                        />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="flex items-baseline gap-2">
                            <span className="truncate text-sm font-medium">{member.name}</span>
                            {member.role && (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {member.role.name}
                              </span>
                            )}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {member.email ?? t("noEmail")}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          />
          {memberError && <FieldError>{memberError}</FieldError>}
        </div>

        <Field data-invalid={!!customEmailError || undefined}>
          <FieldLabel htmlFor={`${idPrefix}-custom-emails`}>{t("customEmails")}</FieldLabel>
          <Controller
            control={form.control}
            name="custom_emails"
            render={({ field }) => (
              <ChipInput
                id={`${idPrefix}-custom-emails`}
                value={field.value}
                onChange={field.onChange}
                max={Math.max(0, RECIPIENT_RULES_MAX_RECIPIENTS - memberIds.length)}
                maxItemLength={254}
                placeholder={t("customEmailsPlaceholder")}
                limitPlaceholder={t("recipientLimit")}
                invalid={!!customEmailError}
                disabled={disabled}
              />
            )}
          />
          <FieldDescription>{copy.customEmailsDescription}</FieldDescription>
          {customEmailError && <FieldError>{customEmailError}</FieldError>}
        </Field>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">{copy.rulesTitle}</p>
            <p className="text-sm text-muted-foreground">{copy.rulesDescription}</p>
          </div>

          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.rulesEmpty}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {fields.map((row, index) => {
                const rowError = errors.rules?.[index]?.text;
                return (
                  <div key={row.id} className="flex items-start gap-2">
                    <Field className="flex-1" data-invalid={!!rowError || undefined}>
                      <Textarea
                        id={`${idPrefix}-rule-${index}`}
                        rows={2}
                        maxLength={RECIPIENT_RULES_RULE_MAX_LENGTH}
                        aria-label={t("ruleLabel", { number: index + 1 })}
                        aria-invalid={!!rowError}
                        placeholder={copy.rulePlaceholders[index % copy.rulePlaceholders.length]}
                        {...form.register(`rules.${index}.text`)}
                      />
                      {rowError && <FieldError>{rowError.message}</FieldError>}
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("removeRule")}
                      disabled={disabled}
                      onClick={() => remove(index)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {rulesError && <FieldError>{rulesError}</FieldError>}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || fields.length >= RECIPIENT_RULES_MAX_RULES}
              onClick={() => append({ text: "" })}
            >
              <PlusIcon />
              {t("addRule")}
            </Button>
            {fields.length >= RECIPIENT_RULES_MAX_RULES && (
              <p className="text-sm text-muted-foreground">{copy.rulesLimitNote}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
