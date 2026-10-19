"use client";

import { useTranslations } from "next-intl";
import { Controller, useFormContext } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceCards } from "@/components/business-profile/choice-cards";
import { AgentSection } from "@/components/agents/detail/agent-section";
import type { AgentSettingsValues } from "@/lib/validation/agent";

const MAX_DESCRIPTION_LENGTH = 500;

export function GeneralSection() {
  const t = useTranslations("agents.sections.general");
  const ta = useTranslations("agents");
  const tc = useTranslations("common");
  const form = useFormContext<AgentSettingsValues>();
  const { errors, disabled } = form.formState;
  const description = form.watch("description");

  return (
    <AgentSection id="general" title={t("title")} description={t("description")}>
      <Field data-invalid={!!errors.name || undefined}>
        <FieldLabel htmlFor="agent-name">{tc("labels.name")}</FieldLabel>
        <Input id="agent-name" aria-invalid={!!errors.name} {...form.register("name")} />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.description || undefined}>
        <FieldLabel htmlFor="agent-description">{tc("labels.description")}</FieldLabel>
        <Textarea
          id="agent-description"
          rows={2}
          placeholder={t("descriptionPlaceholder")}
          aria-invalid={!!errors.description}
          {...form.register("description")}
        />
        <FieldDescription>
          {ta("charCount", { count: description.length, max: MAX_DESCRIPTION_LENGTH })}
        </FieldDescription>
        {errors.description && <FieldError>{errors.description.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel>{ta("purpose.label")}</FieldLabel>
        <Controller
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <ChoiceCards
              value={field.value}
              onChange={(value) => {
                if (!disabled) field.onChange(value);
              }}
              className="max-w-xl"
              options={[
                {
                  value: "inbound",
                  label: ta("purpose.inbound.label"),
                  description: ta("purpose.inbound.description"),
                },
                {
                  value: "outbound",
                  label: ta("purpose.outbound.label"),
                  description: ta("purpose.outbound.description"),
                },
              ]}
            />
          )}
        />
        <FieldDescription>{t("purposeHint")}</FieldDescription>
      </Field>
    </AgentSection>
  );
}
