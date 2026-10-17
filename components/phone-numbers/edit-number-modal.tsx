"use client";

import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EntityModal } from "@/components/business-profile/entity-modal";
import { useBusiness } from "@/components/business/business-provider";
import { AgentSelectField } from "@/components/phone-numbers/agent-select-field";
import { useAgents } from "@/hooks/use-agents";
import { useUpdatePhoneNumber } from "@/hooks/use-phone-numbers";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { formatE164 } from "@/lib/phone";
import type { PhoneNumber } from "@/lib/api/types";
import {
  editPhoneNumberSchema,
  toEditPhoneNumberValues,
  toUpdatePhoneNumberPayload,
  type EditPhoneNumberValues,
} from "@/lib/validation/phone-number";

export function EditNumberModal({
  open,
  onOpenChange,
  number,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  number: PhoneNumber;
}) {
  const { business } = useBusiness();
  const agentsQuery = useAgents(business.id);
  const update = useUpdatePhoneNumber(business.id);

  const form = useForm<EditPhoneNumberValues>({
    resolver: zodResolver(editPhoneNumberSchema),
    defaultValues: toEditPhoneNumberValues(number),
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(
      { id: number.id, payload: toUpdatePhoneNumberPayload(values, number.provider) },
      {
        onSuccess: () => {
          toast.success("Number updated");
          onOpenChange(false);
        },
        onError: (error) => applyServerErrors(form, error),
      }
    );
  });

  return (
    <FormProvider {...form}>
      <EntityModal
        open={open}
        onOpenChange={onOpenChange}
        title={`Edit ${formatE164(number.e164)}`}
        onSubmit={onSubmit}
        submitLabel="Save changes"
        pending={update.isPending}
        isDirty={form.formState.isDirty}
        steps={[
          {
            title: "Details",
            fields: ["friendly_name", "inbound_agent_id", "outbound_agent_id"],
            content: (
              <>
                <Field data-invalid={!!errors.friendly_name || undefined}>
                  <FieldLabel htmlFor="number-friendly-name">Friendly name</FieldLabel>
                  <Input
                    id="number-friendly-name"
                    placeholder="Main line"
                    autoComplete="off"
                    aria-invalid={!!errors.friendly_name}
                    {...form.register("friendly_name")}
                  />
                  {errors.friendly_name && (
                    <FieldError>{errors.friendly_name.message}</FieldError>
                  )}
                </Field>

                <AgentSelectField
                  name="inbound_agent_id"
                  slot="inbound"
                  agents={agentsQuery.data}
                  current={number.inbound_agent}
                  id="number-inbound-agent"
                />

                {number.provider === "twilio" ? (
                  <AgentSelectField
                    name="outbound_agent_id"
                    slot="outbound"
                    agents={agentsQuery.data}
                    current={number.outbound_agent}
                    id="number-outbound-agent"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    SIP numbers are inbound-only — outbound calls always go out from a
                    platform number.
                  </p>
                )}
              </>
            ),
          },
        ]}
      />
    </FormProvider>
  );
}
