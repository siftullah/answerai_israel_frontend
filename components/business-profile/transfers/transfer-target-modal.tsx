"use client";

import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceCards } from "@/components/business-profile/choice-cards";
import { EntityModal } from "@/components/business-profile/entity-modal";
import { WeeklyHoursEditor } from "@/components/business-profile/weekly-hours-editor";
import { useBusiness } from "@/components/business/business-provider";
import { useMembers } from "@/hooks/use-members";
import {
  useCreateTransferTarget,
  useTransferTargets,
  useUpdateTransferTarget,
} from "@/hooks/use-transfer-targets";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import type { ApiError } from "@/lib/api/errors";
import { formatE164 } from "@/lib/phone";
import type { TransferMode, TransferTarget } from "@/lib/api/types";
import {
  toTransferTargetPayload,
  toTransferTargetValues,
  transferTargetSchema,
  type TransferTargetValues,
} from "@/lib/validation/transfer-target";

export function TransferTargetModal({
  open,
  onOpenChange,
  target,
  scopeMode,
  agentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: TransferTarget | null;
  /** The directory's current mode — stamped onto new targets. */
  scopeMode: TransferMode;
  /** New targets go into this agent's own directory instead of the business-wide one. */
  agentId?: string;
}) {
  const { business } = useBusiness();
  const membersQuery = useMembers(business.id);
  const targetsQuery = useTransferTargets(business.id, agentId);
  const create = useCreateTransferTarget(business.id);
  const update = useUpdateTransferTarget(business.id);

  const form = useForm<TransferTargetValues>({
    resolver: zodResolver(transferTargetSchema),
    defaultValues: toTransferTargetValues(target),
  });
  const { errors } = form.formState;
  const destinationKind = form.watch("destination_kind");
  const hoursMode = form.watch("hours_mode");
  const conditionLength = form.watch("condition").length;

  // Members already targeted elsewhere in this scope — a member can be a
  // transfer target only once (the AI routes by the member's name, and names
  // are unique per scope). The edited target's own member stays selectable.
  const usedMemberIds = new Set(
    (targetsQuery.data ?? [])
      .filter((t) => t.id !== target?.id)
      .map((t) => t.business_member?.id)
      .filter((id): id is string => Boolean(id))
  );

  // Base UI's SelectValue renders the raw value unless the root knows the
  // item labels — without this the trigger shows the member's uuid.
  const memberItems = [
    { value: "none", label: "None" },
    ...(membersQuery.data ?? []).map((member) => ({
      value: member.id,
      label: member.name,
    })),
  ];

  // Selecting a member drives the hidden name, the required-number gate, and the
  // override prefill together — reused by the picker and the toggle's "back to
  // member" path so neither can leave the form half-synced.
  const syncMemberFields = (memberId: string) => {
    const member = membersQuery.data?.find((m) => m.id === memberId);
    const phone = member?.phone_e164 ?? "";
    form.setValue("name", member?.name ?? "", { shouldDirty: true });
    form.setValue("member_phone", phone);
    form.setValue("to_e164", phone ? formatE164(phone) : "", { shouldDirty: true });
  };

  // The Name field is hidden for member targets, so a name 422 (e.g. the
  // member's name colliding with an "other" target of the same name) has
  // nowhere to render — surface it as a toast before mapping the rest.
  const handleError = (error: ApiError) => {
    if (
      form.getValues("destination_kind") === "member" &&
      error.status === 422 &&
      error.errors?.name
    ) {
      toast.error(error.errors.name[0]);
    }
    applyServerErrors(form, error);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (target) {
      update.mutate(
        { id: target.id, payload: toTransferTargetPayload(values) },
        {
          onSuccess: () => {
            toast.success("Transfer target saved");
            onOpenChange(false);
          },
          onError: handleError,
        }
      );
    } else {
      create.mutate(
        {
          ...toTransferTargetPayload(values, scopeMode),
          ...(agentId ? { agent_id: agentId } : {}),
        },
        {
          onSuccess: () => {
            toast.success("Transfer target added");
            onOpenChange(false);
          },
          onError: handleError,
        }
      );
    }
  });

  return (
    <FormProvider {...form}>
      <EntityModal
        open={open}
        onOpenChange={onOpenChange}
        title={target ? "Edit transfer target" : "Add transfer target"}
        onSubmit={onSubmit}
        submitLabel={target ? "Save changes" : "Add target"}
        pending={create.isPending || update.isPending}
        isDirty={form.formState.isDirty}
        steps={[
          {
            title: "Details",
            fields: [
              "destination_kind",
              "name",
              "business_member_id",
              "to_e164",
              "post_dial_digits",
              "condition",
            ],
            content: (
              <>
                <Controller
                  control={form.control}
                  name="destination_kind"
                  render={({ field }) => (
                    <ChoiceCards
                      value={field.value as "member" | "other"}
                      onChange={(value) => {
                        field.onChange(value);
                        if (value === "other") {
                          // Clear the member-derived name so the manual field
                          // starts empty; the member-availability option also
                          // disappears, so fall that hours mode back.
                          form.setValue("name", "", { shouldDirty: true });
                          if (form.getValues("hours_mode") === "member") {
                            form.setValue("hours_mode", "inherit", { shouldDirty: true });
                          }
                        } else {
                          // Re-derive name/number from the current selection so a
                          // member→other→member round-trip can't strand the form
                          // with a set member but an empty, now-hidden name.
                          syncMemberFields(form.getValues("business_member_id"));
                        }
                      }}
                      options={[
                        {
                          value: "member",
                          label: "Team member",
                          description: "Someone on your team list.",
                        },
                        {
                          value: "other",
                          label: "Someone else",
                          description: "Any other phone number.",
                        },
                      ]}
                    />
                  )}
                />

                {destinationKind === "other" && (
                  <Field data-invalid={!!errors.name || undefined}>
                    <FieldLabel htmlFor="target-name">Name</FieldLabel>
                    <Input
                      id="target-name"
                      placeholder="Site manager"
                      autoComplete="off"
                      aria-invalid={!!errors.name}
                      {...form.register("name")}
                    />
                    {errors.name && <FieldError>{errors.name.message}</FieldError>}
                  </Field>
                )}

                {destinationKind === "member" && (
                  <Field data-invalid={!!errors.business_member_id || undefined}>
                    <FieldLabel htmlFor="target-member">Team member</FieldLabel>
                    <Controller
                      control={form.control}
                      name="business_member_id"
                      render={({ field }) => (
                        <Select
                          items={memberItems}
                          value={field.value || "none"}
                          onValueChange={(value) => {
                            const id =
                              value === "none" || value === null ? "" : (value as string);
                            field.onChange(id);
                            syncMemberFields(id);
                          }}
                        >
                          <SelectTrigger
                            id="target-member"
                            className="w-full"
                            aria-invalid={!!errors.business_member_id}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {memberItems.map((item) => {
                              const disabled = usedMemberIds.has(item.value);
                              return (
                                <SelectItem
                                  key={item.value}
                                  value={item.value}
                                  disabled={disabled}
                                >
                                  {item.label}
                                  {disabled && (
                                    <span className="ml-auto text-xs text-muted-foreground">
                                      Already a target
                                    </span>
                                  )}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.business_member_id && (
                      <FieldError>{errors.business_member_id.message}</FieldError>
                    )}
                  </Field>
                )}

                <Field data-invalid={!!errors.to_e164 || undefined}>
                  <FieldLabel htmlFor="target-number">Phone number</FieldLabel>
                  <Input
                    id="target-number"
                    type="tel"
                    placeholder="0412 345 678"
                    autoComplete="off"
                    aria-invalid={!!errors.to_e164}
                    {...form.register("to_e164")}
                  />
                  <p className="text-sm text-muted-foreground">
                    {destinationKind === "member"
                      ? "Prefilled from the team member — edit to override, or clear to use their saved number."
                      : "Australian numbers only, e.g. 0412 345 678."}
                  </p>
                  {errors.to_e164 && <FieldError>{errors.to_e164.message}</FieldError>}
                </Field>

                <Field data-invalid={!!errors.post_dial_digits || undefined}>
                  <FieldLabel htmlFor="target-digits">
                    Post-dial digits (optional)
                  </FieldLabel>
                  <Input
                    id="target-digits"
                    placeholder="w123#"
                    autoComplete="off"
                    aria-invalid={!!errors.post_dial_digits}
                    {...form.register("post_dial_digits")}
                  />
                  <p className="text-sm text-muted-foreground">
                    Sent after answer — digits, * and #; w waits half a second.
                  </p>
                  {errors.post_dial_digits && (
                    <FieldError>{errors.post_dial_digits.message}</FieldError>
                  )}
                </Field>

                <Field data-invalid={!!errors.condition || undefined}>
                  <FieldLabel htmlFor="target-condition">When to transfer</FieldLabel>
                  <Textarea
                    id="target-condition"
                    className="min-h-24"
                    placeholder="The caller asks for a quote on commercial work."
                    aria-invalid={!!errors.condition}
                    {...form.register("condition")}
                  />
                  <p className="text-right text-sm text-muted-foreground">
                    {conditionLength} / 500
                  </p>
                  {errors.condition && <FieldError>{errors.condition.message}</FieldError>}
                </Field>
              </>
            ),
          },
          {
            title: "Availability",
            fields: ["hours_mode", "custom_hours"],
            content: (
              <>
                <div>
                  <p className="text-base font-medium">Availability</p>
                  <p className="text-sm text-muted-foreground">
                    When can calls be transferred here?
                  </p>
                </div>

                <Controller
                  control={form.control}
                  name="hours_mode"
                  render={({ field }) => (
                    <ChoiceCards
                      value={field.value}
                      onChange={field.onChange}
                      className={
                        destinationKind === "member" ? "sm:grid-cols-2" : "sm:grid-cols-3"
                      }
                      options={[
                        ...(destinationKind === "member"
                          ? [
                              {
                                value: "member" as const,
                                label: "Availability Hours",
                                description: "Only transfer during member availability hours",
                              },
                            ]
                          : []),
                        {
                          value: "inherit",
                          label: "Business Hours",
                          description: "Only transfer during business/trading hours",
                        },
                        {
                          value: "custom",
                          label: "Custom hours",
                          description: "Set specific days and times.",
                        },
                        {
                          value: "bypass",
                          label: "All time",
                          description: "Any time, day or night.",
                        },
                      ]}
                    />
                  )}
                />
                {errors.hours_mode && <FieldError>{errors.hours_mode.message}</FieldError>}

                {hoursMode === "custom" && (
                  <>
                    <Controller
                      control={form.control}
                      name="custom_hours"
                      render={({ field }) => (
                        <WeeklyHoursEditor value={field.value} onChange={field.onChange} />
                      )}
                    />
                    {errors.custom_hours && (
                      <FieldError>{errors.custom_hours.message as string}</FieldError>
                    )}
                  </>
                )}
              </>
            ),
          },
        ]}
      />
    </FormProvider>
  );
}
