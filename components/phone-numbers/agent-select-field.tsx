"use client";

import { useTranslations } from "next-intl";
import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eligibleAgents } from "@/lib/validation/phone-number";
import type { Agent, PhoneNumberAgentRef } from "@/lib/api/types";

/**
 * Single-agent picker for a number's inbound/outbound slot. Options are the
 * slot-eligible agents (purpose match, active, in sync); "" means none.
 */
export function AgentSelectField({
  name,
  slot,
  agents,
  current,
  id,
  optional = false,
}: {
  name: string;
  slot: "inbound" | "outbound";
  agents: Agent[] | undefined;
  /** Currently-assigned agent — kept in the options even if it's no longer
   * eligible, so the stored value still renders; the server 422s on resubmit. */
  current?: PhoneNumberAgentRef | null;
  id: string;
  /** Appends "(optional)" to the label — for the create flows. */
  optional?: boolean;
}) {
  const t = useTranslations("phoneNumbers.agentSlot");
  const tc = useTranslations("common");
  const form = useFormContext();
  const error = form.formState.errors[name] as { message?: string } | undefined;

  const slotLabel = slot === "inbound" ? t("inbound") : t("outbound");

  const eligible = eligibleAgents(agents, slot).map(({ id: agentId, name: agentName }) => ({
    id: agentId,
    name: agentName,
  }));
  const options =
    current && !eligible.some((agent) => agent.id === current.id)
      ? [...eligible, current]
      : eligible;

  // Base UI's SelectValue renders the raw value unless the root knows the
  // item labels — without this the trigger shows the agent's uuid.
  const items = [
    { value: "none", label: tc("labels.none") },
    ...options.map((agent) => ({ value: agent.id, label: agent.name })),
  ];

  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={id}>
        {optional ? t("optional", { label: slotLabel }) : slotLabel}
      </FieldLabel>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <Select
            items={items}
            value={(field.value as string) || "none"}
            onValueChange={(value) =>
              field.onChange(value === "none" || value === null ? "" : (value as string))
            }
          >
            <SelectTrigger id={id} className="w-full" aria-invalid={!!error}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {eligible.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("noneEligible", { slot })}</p>
      )}
      {error?.message && <FieldError>{error.message}</FieldError>}
    </Field>
  );
}
