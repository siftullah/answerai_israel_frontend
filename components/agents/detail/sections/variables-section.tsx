"use client";

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

export function VariablesSection() {
  const form = useFormContext<AgentSettingsValues>();
  const { errors, disabled } = form.formState;
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "dynamic_variables",
  });

  return (
    <AgentSection
      id="variables"
      title="Variables"
      description="Custom placeholders for your messages. Each one needs a value whenever a call is placed: the default only prefills the place-call form, and campaign recipients without a value are skipped. Variables still referenced in your messages can't be removed until the reference is deleted."
      actions={
        <Button
          type="button"
          variant="cta"
          size="sm"
          disabled={disabled || fields.length >= 30}
          onClick={() => append({ name: "", default_value: "" })}
        >
          <PlusIcon />
          Add variable
        </Button>
      }
    >
      <div className="mb-6 flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium">Built-in variables</p>
          <p className="text-sm text-muted-foreground">
            Filled from the contact record on every call. Tick one to ask for it when placing a
            call, so the caller can confirm or replace it, and to let campaigns supply it per
            recipient. Recipients with no value for a ticked variable are skipped.
          </p>
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
          No custom variables. Built-ins like {"{{business_name}}"} and {"{{contact_name}}"} are
          always available.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {fields.map((row, index) => {
            const rowErrors = errors.dynamic_variables?.[index];
            return (
              <div key={row.id} className="flex items-start gap-3">
                <Field className="flex-1" data-invalid={!!rowErrors?.name || undefined}>
                  {index === 0 && (
                    <FieldLabel htmlFor={`variable-name-${index}`}>Name</FieldLabel>
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
                    <FieldLabel htmlFor={`variable-default-${index}`}>Default value</FieldLabel>
                  )}
                  <Input
                    id={`variable-default-${index}`}
                    placeholder="Empty by default"
                    {...form.register(`dynamic_variables.${index}.default_value`)}
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove variable"
                  disabled={disabled}
                  className={index === 0 ? "mt-6" : undefined}
                  onClick={() => remove(index)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            );
          })}
          {fields.length >= 30 && (
            <p className="text-sm text-muted-foreground">Up to 30 variables per agent.</p>
          )}
        </div>
      )}
    </AgentSection>
  );
}
