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
import { useRegisterSipNumber } from "@/hooks/use-phone-numbers";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import {
  defaultSipNumberValues,
  sipNumberSchema,
  toRegisterSipNumberPayload,
  type SipNumberValues,
} from "@/lib/validation/phone-number";

export function AddSipNumberDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { business } = useBusiness();
  const agentsQuery = useAgents(business.id);
  const register = useRegisterSipNumber(business.id);

  const form = useForm<SipNumberValues>({
    resolver: zodResolver(sipNumberSchema),
    defaultValues: defaultSipNumberValues(),
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    register.mutate(toRegisterSipNumberPayload(values), {
      onSuccess: () => {
        toast.success("SIP number registered");
        onOpenChange(false);
      },
      onError: (error) => applyServerErrors(form, error),
    });
  });

  return (
    <FormProvider {...form}>
      <EntityModal
        open={open}
        onOpenChange={onOpenChange}
        title="Add SIP number"
        description="Register a number your trunk already carries, and calls to it will reach your AI."
        onSubmit={onSubmit}
        submitLabel="Register number"
        submitClassName="bg-cta text-cta-foreground hover:bg-cta/90"
        pending={register.isPending}
        isDirty={form.formState.isDirty}
        steps={[
          {
            title: "Details",
            fields: ["e164", "friendly_name", "inbound_agent_id"],
            content: (
              <>
                <Field data-invalid={!!errors.e164 || undefined}>
                  <FieldLabel htmlFor="sip-number-e164">Phone number</FieldLabel>
                  <Input
                    id="sip-number-e164"
                    type="tel"
                    placeholder="(02) 5550 1234"
                    autoComplete="off"
                    aria-invalid={!!errors.e164}
                    {...form.register("e164")}
                  />
                  <p className="text-sm text-muted-foreground">
                    The number your trunk already carries — include the area code.
                  </p>
                  {errors.e164 && <FieldError>{errors.e164.message}</FieldError>}
                </Field>

                <Field data-invalid={!!errors.friendly_name || undefined}>
                  <FieldLabel htmlFor="sip-number-friendly-name">Friendly name</FieldLabel>
                  <Input
                    id="sip-number-friendly-name"
                    placeholder="Reception line"
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
                  id="sip-number-inbound-agent"
                  optional
                />

                <p className="text-sm text-muted-foreground">
                  SIP numbers are inbound-only — outbound calls always go out from a
                  platform number.
                </p>
              </>
            ),
          },
        ]}
      />
    </FormProvider>
  );
}
