"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useBusiness } from "@/components/business/business-provider";
import { ChoiceCards } from "@/components/business-profile/choice-cards";
import { EntityModal } from "@/components/business-profile/entity-modal";
import { useCreateAgent } from "@/hooks/use-agents";
import { AGENT_TEMPLATES } from "@/lib/api/types";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import {
  createAgentSchema,
  toCreateAgentPayload,
  type CreateAgentValues,
} from "@/lib/validation/agent";

export function CreateAgentModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { business } = useBusiness();
  const createAgent = useCreateAgent(business.id);

  const t = useTranslations("agents");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const schema = useMemo(() => createAgentSchema(tv), [tv]);
  const form = useForm<CreateAgentValues>({
    resolver: zodResolver(schema),
    defaultValues: { template: "blank", name: "", purpose: "inbound" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    createAgent.mutate(toCreateAgentPayload(values), {
      onSuccess: (agent) => {
        toast.success(t("create.toasts.created"));
        onOpenChange(false);
        router.push(`/b/${business.id}/agents/${agent.id}`);
      },
      onError: (error) => applyServerErrors(form, error),
    });
  });

  return (
    <FormProvider {...form}>
      <EntityModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("create.title")}
        description={t("create.description")}
        submitLabel={t("create.submit")}
        pending={createAgent.isPending}
        isDirty={form.formState.isDirty}
        onSubmit={onSubmit}
        steps={[
          {
            title: t("create.steps.template"),
            fields: ["template"],
            content: (
              <Controller
                control={form.control}
                name="template"
                render={({ field }) => (
                  <ChoiceCards
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      const template = AGENT_TEMPLATES.find((t) => t.value === value);
                      if (template) {
                        form.setValue("purpose", template.purpose, { shouldDirty: true });
                      }
                    }}
                    options={AGENT_TEMPLATES.map((template) => ({
                      value: template.value,
                      label: template.label,
                      description: template.description,
                    }))}
                  />
                )}
              />
            ),
          },
          {
            title: t("create.steps.details"),
            fields: ["name", "purpose"],
            content: (
              <>
                <Field data-invalid={!!errors.name || undefined}>
                  <FieldLabel htmlFor="agent-name">{tc("labels.name")}</FieldLabel>
                  <Input
                    id="agent-name"
                    placeholder={t("create.namePlaceholder")}
                    aria-invalid={!!errors.name}
                    {...form.register("name")}
                  />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel>{t("purpose.label")}</FieldLabel>
                  <Controller
                    control={form.control}
                    name="purpose"
                    render={({ field }) => (
                      <ChoiceCards
                        value={field.value}
                        onChange={field.onChange}
                        options={[
                          {
                            value: "inbound",
                            label: t("purpose.inbound.label"),
                            description: t("purpose.inbound.description"),
                          },
                          {
                            value: "outbound",
                            label: t("purpose.outbound.label"),
                            description: t("purpose.outbound.description"),
                          },
                        ]}
                      />
                    )}
                  />
                  <FieldDescription>{t("create.purposeHint")}</FieldDescription>
                </Field>
              </>
            ),
          },
        ]}
      />
    </FormProvider>
  );
}
