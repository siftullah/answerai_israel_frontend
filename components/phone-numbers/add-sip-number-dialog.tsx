"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("phoneNumbers");
  const { business } = useBusiness();
  const agentsQuery = useAgents(business.id);
  const register = useRegisterSipNumber(business.id);

  const tv = useTranslations("validation");
  const schema = useMemo(() => sipNumberSchema(tv), [tv]);
  const form = useForm<SipNumberValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultSipNumberValues(),
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    register.mutate(toRegisterSipNumberPayload(values), {
      onSuccess: () => {
        toast.success(t("toasts.sipRegistered"));
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
        title={t("page.addSipNumber")}
        description={t("addSip.description")}
        onSubmit={onSubmit}
        submitLabel={t("addSip.submit")}
        submitClassName="bg-cta text-cta-foreground hover:bg-cta/90"
        pending={register.isPending}
        isDirty={form.formState.isDirty}
        steps={[
          {
            title: t("form.details"),
            fields: ["e164", "friendly_name", "inbound_agent_id"],
            content: (
              <>
                <Field data-invalid={!!errors.e164 || undefined}>
                  <FieldLabel htmlFor="sip-number-e164">{t("addSip.phoneNumber")}</FieldLabel>
                  <Input
                    id="sip-number-e164"
                    type="tel"
                    placeholder={t("addSip.phonePlaceholder")}
                    autoComplete="off"
                    aria-invalid={!!errors.e164}
                    {...form.register("e164")}
                  />
                  <p className="text-sm text-muted-foreground">{t("addSip.phoneHint")}</p>
                  {errors.e164 && <FieldError>{errors.e164.message}</FieldError>}
                </Field>

                <Field data-invalid={!!errors.friendly_name || undefined}>
                  <FieldLabel htmlFor="sip-number-friendly-name">
                    {t("form.friendlyName")}
                  </FieldLabel>
                  <Input
                    id="sip-number-friendly-name"
                    placeholder={t("addSip.friendlyNamePlaceholder")}
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

                <p className="text-sm text-muted-foreground">{t("form.inboundOnly")}</p>
              </>
            ),
          },
        ]}
      />
    </FormProvider>
  );
}
