"use client";

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

export function GeneralSection() {
  const form = useFormContext<AgentSettingsValues>();
  const { errors, disabled } = form.formState;
  const description = form.watch("description");

  return (
    <AgentSection
      id="general"
      title="General"
      description="Name, internal notes and what this agent is for."
    >
      <Field data-invalid={!!errors.name || undefined}>
        <FieldLabel htmlFor="agent-name">Name</FieldLabel>
        <Input id="agent-name" aria-invalid={!!errors.name} {...form.register("name")} />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.description || undefined}>
        <FieldLabel htmlFor="agent-description">Description</FieldLabel>
        <Textarea
          id="agent-description"
          rows={2}
          placeholder="Internal note about what this agent handles."
          aria-invalid={!!errors.description}
          {...form.register("description")}
        />
        <FieldDescription>{description.length} / 500</FieldDescription>
        {errors.description && <FieldError>{errors.description.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel>Purpose</FieldLabel>
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
                  label: "Inbound",
                  description: "Answers calls to your numbers.",
                },
                {
                  value: "outbound",
                  label: "Outbound",
                  description: "Makes calls — campaigns and callbacks.",
                },
              ]}
            />
          )}
        />
        <FieldDescription>
          Changing purpose affects which phone numbers can use this agent — inbound and
          outbound slots only accept matching agents.
        </FieldDescription>
      </Field>
    </AgentSection>
  );
}
