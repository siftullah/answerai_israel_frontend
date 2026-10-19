"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useBusiness } from "@/components/business/business-provider";
import { EntityModal } from "@/components/business-profile/entity-modal";
import {
  CampaignBasicsFields,
  CampaignPacingFields,
  CampaignScheduleFields,
} from "@/components/campaigns/campaign-form-fields";
import { useAgents } from "@/hooks/use-agents";
import { useCreateCampaign } from "@/hooks/use-campaigns";
import { usePhoneNumbers } from "@/hooks/use-phone-numbers";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { callablePhoneNumbers } from "@/lib/validation/call";
import {
  campaignCreateSchema,
  campaignReadyAgents,
  campaignServerFieldKey,
  defaultCampaignCreateValues,
  toCampaignCreatePayload,
  type CampaignCreateValues,
} from "@/lib/validation/campaign";

export function CreateCampaignModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { business } = useBusiness();
  const createCampaign = useCreateCampaign(business.id);

  const agentsQuery = useAgents(business.id);
  const numbersQuery = usePhoneNumbers(business.id);
  const agents = campaignReadyAgents(agentsQuery.data);
  const numbers = callablePhoneNumbers(numbersQuery.data);

  const t = useTranslations("campaigns");
  const tv = useTranslations("validation");
  const schema = useMemo(() => campaignCreateSchema(tv), [tv]);
  const form = useForm<CampaignCreateValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultCampaignCreateValues(),
  });

  const onSubmit = form.handleSubmit((values) => {
    createCampaign.mutate(toCampaignCreatePayload(values, business.timezone), {
      onSuccess: (campaign) => {
        toast.success(t("toasts.created"));
        onOpenChange(false);
        router.push(`/b/${business.id}/calls/campaigns/${campaign.id}`);
      },
      onError: (error) =>
        applyServerErrors(form, error, { mapKey: campaignServerFieldKey }),
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
        pending={createCampaign.isPending}
        isDirty={form.formState.isDirty}
        onSubmit={onSubmit}
        steps={[
          {
            title: t("create.steps.basics"),
            fields: ["name", "agent_id", "caller_phone_number_id"],
            content: (
              <CampaignBasicsFields
                agents={agents}
                numbers={numbers}
                agentsLoading={agentsQuery.isPending}
                numbersLoading={numbersQuery.isPending}
              />
            ),
          },
          {
            title: t("create.steps.pacingSchedule"),
            fields: [
              "start_date",
              "start_time",
              "end_date",
              "end_time",
              "max_concurrent",
              "max_attempts",
              "retry_delay_minutes",
              "retry_on",
            ],
            content: (
              <>
                <CampaignScheduleFields />
                <CampaignPacingFields />
              </>
            ),
          },
        ]}
      />
    </FormProvider>
  );
}
