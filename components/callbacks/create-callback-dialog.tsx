"use client";

import { useState } from "react";
import Link from "next/link";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronDownIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useBusiness } from "@/components/business/business-provider";
import { ContactCombobox } from "@/components/callbacks/contact-combobox";
import { ScheduleField } from "@/components/callbacks/schedule-field";
import { useAgents } from "@/hooks/use-agents";
import { useCreateCallback } from "@/hooks/use-callbacks";
import { useMembers } from "@/hooks/use-members";
import { usePhoneNumbers } from "@/hooks/use-phone-numbers";
import { formatE164 } from "@/lib/phone";
import { callablePhoneNumbers } from "@/lib/validation/call";
import {
  applyCallbackServerErrors,
  createCallbackSchema,
  defaultCreateCallbackValues,
  toStoreCallbackPayload,
  type CreateCallbackValues,
} from "@/lib/validation/callback";
import { eligibleAgents } from "@/lib/validation/phone-number";
import type { Callback, CallbackType, Contact } from "@/lib/api/types";

function SelectField({
  name,
  label,
  placeholder,
  options,
  emptyNote,
}: {
  name: "assignee_user_id" | "agent_id" | "caller_phone_number_id";
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  emptyNote?: React.ReactNode;
}) {
  const id = `create-callback-${name}`;
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
          {options.length === 0 && emptyNote && (
            <p className="text-sm text-muted-foreground">{emptyNote}</p>
          )}
          {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
        </Field>
      )}
    />
  );
}

const RETRY_ATTEMPT_OPTIONS = ["1", "2", "3", "4", "5"];
const RETRY_DELAY_OPTIONS = [
  { value: "5", label: "5 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
];

/**
 * Manual callback creation, both types: a team-member task (email reminder,
 * human completes it) or an AI-agent outbound call (dispatcher dials at the
 * scheduled time). The backend re-validates hours/availability/eligibility —
 * its 422 reasons land on the implicated fields.
 */
export function CreateCallbackDialog({
  open,
  onOpenChange,
  onCreated,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (callback: Callback) => void;
  /** Prefill for contact-page entry points. */
  defaults?: Partial<CreateCallbackValues>;
}) {
  const { business } = useBusiness();
  const agentsQuery = useAgents(business.id);
  const numbersQuery = usePhoneNumbers(business.id);
  const membersQuery = useMembers(business.id);
  const createCallback = useCreateCallback(business.id);

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const form = useForm<CreateCallbackValues>({
    resolver: zodResolver(createCallbackSchema),
    defaultValues: defaultCreateCallbackValues(defaults),
  });
  const type = form.watch("type");
  const contactError = form.formState.errors.contact_id;
  const rootServerError = (
    form.formState.errors.root as Record<string, { message?: string }> | undefined
  )?.server;

  const agents = eligibleAgents(agentsQuery.data, "outbound");
  const numbers = callablePhoneNumbers(numbersQuery.data);
  const assignees = (membersQuery.data ?? []).filter(
    (member) => member.has_account && member.user
  );

  const onSubmit = form.handleSubmit((values) => {
    createCallback.mutate(toStoreCallbackPayload(values, business.timezone), {
      onSuccess: (callback) => {
        toast.success("Callback scheduled");
        onOpenChange(false);
        onCreated(callback);
      },
      onError: (error) => applyCallbackServerErrors(form, error),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New callback</DialogTitle>
          <DialogDescription>
            Schedule a call back to a contact — handled by a team member or dialed by an AI
            agent.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Controller
              name="type"
              control={form.control}
              render={({ field }) => (
                <Tabs
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as CallbackType)}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="team_member">Team member</TabsTrigger>
                    <TabsTrigger value="agent">AI agent</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            />

            <Field data-invalid={!!contactError || undefined}>
              <FieldLabel htmlFor="create-callback-contact">Contact</FieldLabel>
              <ContactCombobox
                id="create-callback-contact"
                selected={selectedContact}
                invalid={!!contactError}
                onSelect={(contact) => {
                  setSelectedContact(contact);
                  form.setValue("contact_id", contact.id, { shouldValidate: true });
                }}
              />
              {contactError?.message && <FieldError>{contactError.message}</FieldError>}
            </Field>

            {selectedContact?.on_dnc && (
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertDescription>
                  This contact is on your do-not-call list. The callback can still be
                  scheduled, but consider whether they should be contacted.
                </AlertDescription>
              </Alert>
            )}

            <ScheduleField<CreateCallbackValues>
              dateName="date"
              timeName="time"
              idPrefix="create-callback"
            />

            {type === "team_member" ? (
              <SelectField
                name="assignee_user_id"
                label="Assignee"
                placeholder="Choose a team member"
                options={assignees.map((member) => ({
                  value: member.user?.id ?? "",
                  label: member.name,
                }))}
                emptyNote={
                  <>
                    No team members with an account yet — invite one under{" "}
                    <Link
                      href={`/b/${business.id}/business-profile/team`}
                      className="text-primary hover:underline"
                    >
                      Team
                    </Link>
                    .
                  </>
                }
              />
            ) : (
              <>
                <SelectField
                  name="agent_id"
                  label="Agent"
                  placeholder="Choose an outbound agent"
                  options={agents.map((agent) => ({ value: agent.id, label: agent.name }))}
                  emptyNote={
                    <>
                      No synced outbound agents — create one under{" "}
                      <Link
                        href={`/b/${business.id}/agents`}
                        className="text-primary hover:underline"
                      >
                        Agents
                      </Link>{" "}
                      first.
                    </>
                  }
                />
                <SelectField
                  name="caller_phone_number_id"
                  label="Call from"
                  placeholder="Choose a number"
                  options={numbers.map((number) => ({
                    value: number.id,
                    label: number.friendly_name
                      ? `${number.friendly_name} (${formatE164(number.e164)})`
                      : formatE164(number.e164),
                  }))}
                  emptyNote={
                    <>
                      No dialable numbers — SIP numbers are inbound-only, so buy a platform
                      number under{" "}
                      <Link
                        href={`/b/${business.id}/phone-numbers`}
                        className="text-primary hover:underline"
                      >
                        Phone numbers
                      </Link>
                      .
                    </>
                  }
                />
                <Collapsible className="flex flex-col gap-3">
                  <CollapsibleTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="group self-start px-2 text-muted-foreground"
                      />
                    }
                  >
                    Retry settings
                    <ChevronDownIcon className="transition-transform group-data-panel-open:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="grid grid-cols-2 gap-3">
                    <Controller
                      name="max_attempts"
                      control={form.control}
                      render={({ field }) => {
                        const items = [
                          { value: "", label: "2 (default)" },
                          ...RETRY_ATTEMPT_OPTIONS.map((n) => ({ value: n, label: n })),
                        ];
                        return (
                          <Field>
                            <FieldLabel htmlFor="create-callback-max-attempts">
                              Max attempts
                            </FieldLabel>
                            <Select
                              items={items}
                              value={field.value}
                              onValueChange={(value) =>
                                field.onChange((value as string | null) ?? "")
                              }
                            >
                              <SelectTrigger
                                id="create-callback-max-attempts"
                                className="w-full"
                              >
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
                          </Field>
                        );
                      }}
                    />
                    <Controller
                      name="retry_delay_minutes"
                      control={form.control}
                      render={({ field }) => {
                        const items = [
                          { value: "", label: "30 minutes (default)" },
                          ...RETRY_DELAY_OPTIONS,
                        ];
                        return (
                          <Field>
                            <FieldLabel htmlFor="create-callback-retry-delay">
                              Retry after
                            </FieldLabel>
                            <Select
                              items={items}
                              value={field.value}
                              onValueChange={(value) =>
                                field.onChange((value as string | null) ?? "")
                              }
                            >
                              <SelectTrigger
                                id="create-callback-retry-delay"
                                className="w-full"
                              >
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
                          </Field>
                        );
                      }}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            <Field data-invalid={!!form.formState.errors.topic || undefined}>
              <FieldLabel htmlFor="create-callback-topic">Topic</FieldLabel>
              <Input
                id="create-callback-topic"
                {...form.register("topic")}
                placeholder="What is the callback about? (optional)"
                aria-invalid={!!form.formState.errors.topic}
              />
              {form.formState.errors.topic?.message && (
                <FieldError>{form.formState.errors.topic.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!form.formState.errors.notes || undefined}>
              <FieldLabel htmlFor="create-callback-notes">Notes</FieldLabel>
              <Textarea
                id="create-callback-notes"
                {...form.register("notes")}
                placeholder="Context for whoever makes the call (optional)"
                rows={3}
                aria-invalid={!!form.formState.errors.notes}
              />
              {form.formState.errors.notes?.message && (
                <FieldError>{form.formState.errors.notes.message}</FieldError>
              )}
            </Field>

            {rootServerError?.message && (
              <Alert variant="destructive">
                <AlertDescription>{rootServerError.message}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCallback.isPending}>
                {createCallback.isPending ? "Scheduling…" : "Schedule callback"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
