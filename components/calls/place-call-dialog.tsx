"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBusiness } from "@/components/business/business-provider";
import { useAgents } from "@/hooks/use-agents";
import { usePhoneNumbers } from "@/hooks/use-phone-numbers";
import { usePlaceCall } from "@/hooks/use-calls";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { formatE164 } from "@/lib/phone";
import { eligibleAgents } from "@/lib/validation/phone-number";
import {
  callablePhoneNumbers,
  defaultPlaceCallValues,
  placeCallSchema,
  placeCallServerFieldKey,
  toPlaceCallPayload,
  type PlaceCallValues,
} from "@/lib/validation/call";
import { agentCallVariables } from "@/lib/validation/agent";
import type { Call, Contact } from "@/lib/api/types";

/** crypto.randomUUID needs a secure context — local .test HTTP doesn't have one. */
function randomKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function SelectField({
  name,
  label,
  placeholder,
  options,
  emptyNote,
}: {
  name: "agent_id" | "from_phone_number_id";
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  emptyNote: string;
}) {
  const id = `place-call-${name}`;
  const items = [{ value: "", label: placeholder }, ...options];

  return (
    <Controller
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={!!fieldState.error || undefined}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Select
            items={items}
            value={field.value}
            onValueChange={(value) => field.onChange((value as string | null) ?? "")}
          >
            <SelectTrigger id={id} className="w-full" aria-invalid={!!fieldState.error}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {options.length === 0 && <p className="text-sm text-muted-foreground">{emptyNote}</p>}
          {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
        </Field>
      )}
    />
  );
}

/** What the contact record would give a built-in, so the dialog can prefill it. */
function contactValueFor(contact: Contact | null | undefined, name: string): string {
  if (!contact) return "";
  switch (name) {
    case "contact_name":
      return contact.name ?? "";
    case "contact_email":
      return (contact.emails.find((entry) => entry.primary) ?? contact.emails[0])?.email ?? "";
    case "contact_company":
      return contact.company ?? "";
    case "contact_address":
      return contact.address ?? "";
    default:
      return "";
  }
}

/**
 * Single-call dialog: agent + from-number + destination, plus a value for every
 * variable the chosen agent needs — its overridable built-ins (prefilled from the
 * contact when the call starts from one) and its custom variables (prefilled from
 * their defaults). Nothing is sent blank. The idempotency key is minted per dialog
 * open, so an accidental double-submit can't place two calls.
 */
export function PlaceCallDialog({
  open,
  onOpenChange,
  onPlaced,
  defaults,
  contact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaced: (call: Call) => void;
  /** Prefill for contact-initiated calls: to_number + contact_id. */
  defaults?: Partial<PlaceCallValues>;
  /** The contact the call starts from, so overridable built-ins prefill from its record. */
  contact?: Contact | null;
}) {
  const { business } = useBusiness();
  const agentsQuery = useAgents(business.id);
  const numbersQuery = usePhoneNumbers(business.id);
  const placeCall = usePlaceCall(business.id);

  const [idempotencyKey, setIdempotencyKey] = useState(randomKey);

  const t = useTranslations("calls");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const schema = useMemo(() => placeCallSchema(tv), [tv]);
  const form = useForm<PlaceCallValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultPlaceCallValues(defaults),
  });
  const rootServerError = (
    form.formState.errors.root as Record<string, { message?: string }> | undefined
  )?.server;

  // Fresh form and a fresh idempotency key on every open. Keyed on the open
  // prop, not the Dialog's onOpenChange: that callback only fires for the
  // dialog's own close gestures, never when the parent opens it, so a second
  // call from the same page reused the first key and the API just returned the
  // first call again.
  useEffect(() => {
    if (!open) return;
    form.reset(defaultPlaceCallValues(defaults));
    setIdempotencyKey(randomKey());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const agents = eligibleAgents(agentsQuery.data, "outbound");
  const numbers = callablePhoneNumbers(numbersQuery.data);

  // Re-key the variable pairs to the chosen agent's set whenever they diverge
  // (agent picked, swapped, or the dialog reopened): an overridable built-in
  // starts from the contact record, a custom variable from its default, and the
  // caller fills or replaces any of them — the backend rejects a blank value
  // rather than falling back. Values typed for a name that survives an agent
  // swap are kept.
  const selectedAgentId = form.watch("agent_id");
  const declared = agentCallVariables(
    agents.find((agent) => agent.id === selectedAgentId)?.config
  );
  const declaredKey = declared.map((variable) => variable.name).join(",");
  const pairs = form.watch("dynamic_variables");
  const pairsKey = pairs.map((pair) => pair.name).join(",");
  useEffect(() => {
    if (pairsKey === declaredKey) return;
    const current = new Map(
      form.getValues("dynamic_variables").map((pair) => [pair.name, pair.value])
    );
    // setValue, not resetField: resetField is a no-op until an input under the
    // array is registered, and the dialog opens with none rendered.
    form.setValue(
      "dynamic_variables",
      declared.map((variable) => ({
        name: variable.name,
        value:
          current.get(variable.name) ||
          (variable.builtin ? contactValueFor(contact, variable.name) : (variable.default_value ?? "")),
      })),
      { shouldDirty: false }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [declaredKey, pairsKey]);

  const onSubmit = form.handleSubmit((values) => {
    placeCall.mutate(
      { payload: toPlaceCallPayload(values), idempotencyKey },
      {
        onSuccess: (call) => {
          toast.success(t("toasts.callQueued"));
          onOpenChange(false);
          onPlaced(call);
        },
        onError: (error) =>
          applyServerErrors(form, error, {
            mapKey: (key) => placeCallServerFieldKey(form.getValues(), key),
          }),
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("placeDialog.title")}</DialogTitle>
          <DialogDescription>{t("placeDialog.description")}</DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <SelectField
            name="agent_id"
            label={t("labels.agent")}
            placeholder={t("placeDialog.agentPlaceholder")}
            options={agents.map((agent) => ({ value: agent.id, label: agent.name }))}
            emptyNote={t("placeDialog.noAgents")}
          />
          <SelectField
            name="from_phone_number_id"
            label={t("placeDialog.callFrom")}
            placeholder={t("placeDialog.numberPlaceholder")}
            options={numbers.map((number) => ({
              value: number.id,
              label: number.friendly_name
                ? `${number.friendly_name} (${formatE164(number.e164)})`
                : formatE164(number.e164),
            }))}
            emptyNote={t("placeDialog.noNumbers")}
          />
          <Field data-invalid={!!form.formState.errors.to_number || undefined}>
            <FieldLabel htmlFor="place-call-to">{t("placeDialog.numberToCall")}</FieldLabel>
            <Input
              id="place-call-to"
              {...form.register("to_number")}
              placeholder={t("placeDialog.numberToCallPlaceholder")}
              autoComplete="off"
              aria-invalid={!!form.formState.errors.to_number}
            />
            {form.formState.errors.to_number?.message && (
              <FieldError>{form.formState.errors.to_number.message}</FieldError>
            )}
          </Field>

          {pairs.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{t("placeDialog.variablesHint")}</p>
              {pairs.map((pair, index) => {
                const error = form.formState.errors.dynamic_variables?.[index]?.value;
                return (
                  <Field key={pair.name} data-invalid={!!error || undefined}>
                    <FieldLabel htmlFor={`place-call-variable-${pair.name}`} className="font-mono">
                      {pair.name}
                    </FieldLabel>
                    <Input
                      id={`place-call-variable-${pair.name}`}
                      autoComplete="off"
                      aria-invalid={!!error}
                      {...form.register(`dynamic_variables.${index}.value`)}
                    />
                    {error?.message && <FieldError>{error.message}</FieldError>}
                  </Field>
                );
              })}
            </div>
          )}

          {rootServerError?.message && (
            <Alert variant="destructive">
              <AlertDescription>{rootServerError.message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={placeCall.isPending}>
              {placeCall.isPending ? t("actions.placing") : t("actions.placeCall")}
            </Button>
          </DialogFooter>
        </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
