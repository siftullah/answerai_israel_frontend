"use client";

import { useTranslations } from "next-intl";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AgentSection } from "@/components/agents/detail/agent-section";
import { OVERRIDABLE_BUILTIN_LABELS, OVERRIDABLE_BUILTIN_VARIABLES } from "@/lib/api/types";
import type { AgentSettingsValues } from "@/lib/validation/agent";

const MAX_VARIABLES = 30;

export function VariablesSection() {
  const t = useTranslations("agents.sections.variables");
  const tc = useTranslations("common");
  const form = useFormContext<AgentSettingsValues>();
  const { errors, disabled } = form.formState;
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "dynamic_variables",
  });

  return (
    <AgentSection
      id="variables"
      title={t("title")}
      description={t("description")}
      actions={
        <Button
          type="button"
          variant="cta"
          size="sm"
          disabled={disabled || fields.length >= MAX_VARIABLES}
          onClick={() => append({ name: "", default_value: "" })}
        >
          <PlusIcon />
          {t("add")}
        </Button>
      }
    >
      <div className="mb-6 flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium">{t("builtins.title")}</p>
          <p className="text-sm text-muted-foreground">{t("builtins.description")}</p>
        </div>
        <Controller
          control={form.control}
          name="overridable_builtins"
          render={({ field }) => (
            <div className="grid gap-2 sm:grid-cols-2">
              {OVERRIDABLE_BUILTIN_VARIABLES.map((name) => (
                <Label key={name} className="flex items-start gap-2 font-normal">
                  <Checkbox
                    className="mt-0.5"
                    disabled={disabled}
                    checked={field.value.includes(name)}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        checked
                          ? [...field.value, name]
                          : field.value.filter((value) => value !== name)
                      )
                    }
                  />
                  <span className="flex flex-col">
                    <span className="font-mono">{name}</span>
                    <span className="text-xs text-muted-foreground">
                      {OVERRIDABLE_BUILTIN_LABELS[name]}
                    </span>
                  </span>
                </Label>
              ))}
            </div>
          )}
        />
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("empty", {
            businessToken: "{{business_name}}",
            contactToken: "{{contact_name}}",
          })}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {fields.map((row, index) => {
            const rowErrors = errors.dynamic_variables?.[index];
            return (
              <div key={row.id} className="flex items-start gap-3">
                <Field className="flex-1" data-invalid={!!rowErrors?.name || undefined}>
                  {index === 0 && (
                    <FieldLabel htmlFor={`variable-name-${index}`}>{tc("labels.name")}</FieldLabel>
                  )}
                  <Input
                    id={`variable-name-${index}`}
                    placeholder="customer_ref"
                    className="font-mono"
                    aria-invalid={!!rowErrors?.name}
                    {...form.register(`dynamic_variables.${index}.name`)}
                  />
                  {rowErrors?.name && <FieldError>{rowErrors.name.message}</FieldError>}
                </Field>
                <Field className="flex-1">
                  {index === 0 && (
                    <FieldLabel htmlFor={`variable-default-${index}`}>
                      {t("defaultLabel")}
                    </FieldLabel>
                  )}
                  <Input
                    id={`variable-default-${index}`}
                    placeholder={t("defaultPlaceholder")}
                    {...form.register(`dynamic_variables.${index}.default_value`)}
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("remove")}
                  disabled={disabled}
                  className={index === 0 ? "mt-6" : undefined}
                  onClick={() => remove(index)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            );
          })}
          {fields.length >= MAX_VARIABLES && (
            <p className="text-sm text-muted-foreground">
              {t("limit", { max: MAX_VARIABLES })}
            </p>
          )}
        </div>
      )}
    </AgentSection>
  );
}
