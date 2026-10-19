"use client";

import { useTranslations } from "next-intl";
import { Controller, useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeInput } from "@/components/ui/time-input";
import type { Agent, PhoneNumber } from "@/lib/api/types";
import { CAMPAIGN_RETRY_REASONS } from "@/lib/api/types";
import { formatE164 } from "@/lib/phone";
import type { CampaignCreateValues } from "@/lib/validation/campaign";

/**
 * Field groups shared by the create modal and the settings tab. Both forms
 * extend CampaignCreateValues, so the context is typed to that common base.
 */
export function CampaignBasicsFields({
  agents,
  numbers,
  agentsLoading = false,
  numbersLoading = false,
}: {
  /** Pre-filtered: outbound + active + in-sync. */
  agents: Agent[];
  /** Pre-filtered: Twilio + active + voice. */
  numbers: PhoneNumber[];
  /** While true the "none ready" hints hold back — an empty list mid-fetch isn't news. */
  agentsLoading?: boolean;
  numbersLoading?: boolean;
}) {
  const t = useTranslations("campaigns.form");
  const tc = useTranslations("common");
  const form = useFormContext<CampaignCreateValues>();
  const { errors } = form.formState;

  const agentItems = agents.map((agent) => ({ value: agent.id, label: agent.name }));
  const numberItems = numbers.map((number) => ({
    value: number.id,
    label: number.friendly_name
      ? `${formatE164(number.e164)} — ${number.friendly_name}`
      : formatE164(number.e164),
  }));

  return (
    <>
      <Field data-invalid={!!errors.name || undefined}>
        <FieldLabel htmlFor="campaign-name">{tc("labels.name")}</FieldLabel>
        <Input
          id="campaign-name"
          placeholder={t("namePlaceholder")}
          aria-invalid={!!errors.name}
          {...form.register("name")}
        />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.agent_id || undefined}>
        <FieldLabel>{t("agent")}</FieldLabel>
        <Controller
          control={form.control}
          name="agent_id"
          render={({ field }) => (
            <Select
              items={agentItems}
              value={field.value === "" ? null : field.value}
              onValueChange={(value) => field.onChange((value as string | null) ?? "")}
              disabled={agentItems.length === 0}
            >
              <SelectTrigger aria-label={t("agent")} aria-invalid={!!errors.agent_id}>
                <SelectValue placeholder={t("agentPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {agentItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {!agentsLoading && agents.length === 0 ? (
          <FieldDescription>{t("noAgents")}</FieldDescription>
        ) : (
          <FieldDescription>{t("agentHint")}</FieldDescription>
        )}
        {errors.agent_id && <FieldError>{errors.agent_id.message}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.caller_phone_number_id || undefined}>
        <FieldLabel>{t("callerNumber")}</FieldLabel>
        <Controller
          control={form.control}
          name="caller_phone_number_id"
          render={({ field }) => (
            <Select
              items={numberItems}
              value={field.value === "" ? null : field.value}
              onValueChange={(value) => field.onChange((value as string | null) ?? "")}
              disabled={numberItems.length === 0}
            >
              <SelectTrigger
                aria-label={t("callerNumber")}
                aria-invalid={!!errors.caller_phone_number_id}
              >
                <SelectValue placeholder={t("numberPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {numberItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {!numbersLoading && numbers.length === 0 ? (
          <FieldDescription>{t("noNumbers")}</FieldDescription>
        ) : (
          <FieldDescription>{t("numberHint")}</FieldDescription>
        )}
        {errors.caller_phone_number_id && (
          <FieldError>{errors.caller_phone_number_id.message}</FieldError>
        )}
      </Field>
    </>
  );
}

export function CampaignScheduleFields() {
  const t = useTranslations("campaigns.form");
  const form = useFormContext<CampaignCreateValues>();
  const { errors } = form.formState;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.start_date || undefined}>
          <FieldLabel htmlFor="campaign-start-date">{t("startDate")}</FieldLabel>
          <Controller
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <DatePicker
                id="campaign-start-date"
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                invalid={!!errors.start_date}
                clearable
              />
            )}
          />
          {errors.start_date && <FieldError>{errors.start_date.message}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.start_time || undefined}>
          <FieldLabel htmlFor="campaign-start-time">{t("startTime")}</FieldLabel>
          <TimeInput
            id="campaign-start-time"
            aria-invalid={!!errors.start_time}
            {...form.register("start_time")}
          />
          {errors.start_time && <FieldError>{errors.start_time.message}</FieldError>}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.end_date || undefined}>
          <FieldLabel htmlFor="campaign-end-date">{t("endDate")}</FieldLabel>
          <Controller
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <DatePicker
                id="campaign-end-date"
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                invalid={!!errors.end_date}
                clearable
              />
            )}
          />
          {errors.end_date && <FieldError>{errors.end_date.message}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.end_time || undefined}>
          <FieldLabel htmlFor="campaign-end-time">{t("endTime")}</FieldLabel>
          <TimeInput
            id="campaign-end-time"
            aria-invalid={!!errors.end_time}
            {...form.register("end_time")}
          />
          {errors.end_time && <FieldError>{errors.end_time.message}</FieldError>}
        </Field>
      </div>
      <FieldDescription>{t("scheduleHint")}</FieldDescription>
    </>
  );
}

export function CampaignPacingFields() {
  const t = useTranslations("campaigns.form");
  const form = useFormContext<CampaignCreateValues>();
  const { errors } = form.formState;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field data-invalid={!!errors.max_concurrent || undefined}>
          <FieldLabel htmlFor="campaign-max-concurrent">{t("maxConcurrent")}</FieldLabel>
          <Input
            id="campaign-max-concurrent"
            type="number"
            min={1}
            max={50}
            aria-invalid={!!errors.max_concurrent}
            {...form.register("max_concurrent", { valueAsNumber: true })}
          />
          {errors.max_concurrent && <FieldError>{errors.max_concurrent.message}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.max_attempts || undefined}>
          <FieldLabel htmlFor="campaign-max-attempts">{t("maxAttempts")}</FieldLabel>
          <Input
            id="campaign-max-attempts"
            type="number"
            min={1}
            max={5}
            aria-invalid={!!errors.max_attempts}
            {...form.register("max_attempts", { valueAsNumber: true })}
          />
          {errors.max_attempts && <FieldError>{errors.max_attempts.message}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.retry_delay_minutes || undefined}>
          <FieldLabel htmlFor="campaign-retry-delay">{t("retryDelay")}</FieldLabel>
          <Input
            id="campaign-retry-delay"
            type="number"
            min={5}
            max={1440}
            aria-invalid={!!errors.retry_delay_minutes}
            {...form.register("retry_delay_minutes", { valueAsNumber: true })}
          />
          {errors.retry_delay_minutes && (
            <FieldError>{errors.retry_delay_minutes.message}</FieldError>
          )}
        </Field>
      </div>

      <Field>
        <FieldLabel>{t("retryOn")}</FieldLabel>
        <Controller
          control={form.control}
          name="retry_on"
          render={({ field }) => (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {CAMPAIGN_RETRY_REASONS.map((reason) => (
                <Label key={reason} className="flex items-center gap-2 font-normal">
                  <Checkbox
                    checked={field.value.includes(reason)}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        checked
                          ? [...field.value, reason]
                          : field.value.filter((value) => value !== reason)
                      )
                    }
                  />
                  {t(`retryReasons.${reason}`)}
                </Label>
              ))}
            </div>
          )}
        />
        <FieldDescription>{t("retryOnHint")}</FieldDescription>
      </Field>
    </>
  );
}
