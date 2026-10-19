"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ErrorState } from "@/components/error-state";
import { useBusiness } from "@/components/business/business-provider";
import { AgentSection } from "@/components/agents/detail/agent-section";
import {
  RecipientRulesFields,
  type RecipientRulesCopy,
} from "@/components/settings/notifications/recipient-rules-fields";
import {
  useAgentCallSummarySettings,
  useSendCallSummaryTest,
  useUpdateAgentCallSummarySettings,
} from "@/hooks/use-agent-call-summary-settings";
import { useMembers } from "@/hooks/use-members";
import type { Agent, CallSummarySettings } from "@/lib/api/types";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import {
  recipientRulesSchema,
  recipientRulesServerErrorKey,
  toRecipientRulesPayload,
  toRecipientRulesValues,
  type RecipientRulesValues,
} from "@/lib/validation/recipient-rules";

/**
 * Standalone card: its own query, form and save — deliberately outside the
 * versioned agent config, so saving here never republishes to the voice
 * engine or dirties the page-level save bar.
 */
export function CallSummarySection({ agent }: { agent: Agent }) {
  const t = useTranslations("agents.sections.callSummary");
  const { business } = useBusiness();
  const settingsQuery = useAgentCallSummarySettings(business.id, agent.id);

  return (
    <AgentSection id="call-summary" title={t("title")} description={t("description")}>
      {settingsQuery.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : settingsQuery.isError ? (
        <ErrorState
          title={t("loadError")}
          message={settingsQuery.error.message}
          onRetry={() => settingsQuery.refetch()}
        />
      ) : (
        <CallSummaryForm agent={agent} businessUuid={business.id} settings={settingsQuery.data} />
      )}
    </AgentSection>
  );
}

function CallSummaryForm({
  agent,
  businessUuid,
  settings,
}: {
  agent: Agent;
  businessUuid: string;
  settings: CallSummarySettings;
}) {
  const archived = agent.status === "archived";
  const membersQuery = useMembers(businessUuid);
  const update = useUpdateAgentCallSummarySettings(businessUuid, agent.id);
  const sendTest = useSendCallSummaryTest(agent.id);

  const t = useTranslations("agents.sections.callSummary");
  const tc = useTranslations("common");
  const copy = useMemo<RecipientRulesCopy>(
    () => ({
      enabledLabel: t("copy.enabledLabel"),
      enabledDescription: t("copy.enabledDescription"),
      recipientsTitle: t("copy.recipientsTitle"),
      recipientsDescription: t("copy.recipientsDescription"),
      customEmailsDescription: t("copy.customEmailsDescription"),
      rulesTitle: t("copy.rulesTitle"),
      rulesDescription: t("copy.rulesDescription"),
      rulesEmpty: t("copy.rulesEmpty"),
      rulePlaceholders: [
        t("copy.rulePlaceholders.repairs"),
        t("copy.rulePlaceholders.skip"),
        t("copy.rulePlaceholders.address"),
      ],
      rulesLimitNote: t("copy.rulesLimitNote"),
    }),
    [t]
  );

  const tv = useTranslations("validation");
  const schema = useMemo(() => recipientRulesSchema(tv), [tv]);
  const form = useForm<RecipientRulesValues>({
    resolver: zodResolver(schema),
    defaultValues: toRecipientRulesValues(settings),
    disabled: archived,
  });
  const { errors, isDirty } = form.formState;
  const enabled = form.watch("enabled");

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(toRecipientRulesPayload(values), {
      onSuccess: (result) => {
        form.reset(toRecipientRulesValues(result));
        toast.success(t("toasts.saved"));
      },
      onError: (error) => {
        applyServerErrors(form, error, { mapKey: recipientRulesServerErrorKey });
        toast.error(error.message);
      },
    });
  });

  const sendSample = () => {
    sendTest.mutate(undefined, {
      onSuccess: (result) => {
        if (result.sent) {
          toast.success(
            t("toasts.sampleSent", { count: result.emails.length, email: result.sent_to })
          );
        } else {
          toast.info(result.reason ?? t("toasts.nobody"));
        }
      },
      onError: (error) => toast.error(error.message),
    });
  };

  // Samples are built from the SAVED settings, so unsaved edits can't be previewed.
  const sampleTooltip = archived
    ? t("sampleTooltip.archived")
    : !enabled
      ? t("sampleTooltip.disabled")
      : isDirty
        ? t("sampleTooltip.unsaved")
        : null;
  const sampleDisabled = sampleTooltip !== null || update.isPending || sendTest.isPending;

  const sampleButton = (
    <Button type="button" variant="outline" disabled={sampleDisabled} onClick={sendSample}>
      {sendTest.isPending && <Spinner />}
      {t("sendSample")}
    </Button>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {errors.root?.server && (
        <Alert variant="destructive">
          <AlertDescription>{errors.root.server.message}</AlertDescription>
        </Alert>
      )}

      <RecipientRulesFields
        form={form}
        idPrefix="call-summary"
        membersQuery={membersQuery}
        copy={copy}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        {sampleTooltip ? (
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>{sampleButton}</TooltipTrigger>
            <TooltipContent className="max-w-64">{sampleTooltip}</TooltipContent>
          </Tooltip>
        ) : (
          sampleButton
        )}
        {isDirty && (
          <Button
            type="button"
            variant="ghost"
            disabled={update.isPending}
            onClick={() => form.reset()}
          >
            {tc("actions.discard")}
          </Button>
        )}
        <Button type="submit" disabled={!isDirty || update.isPending}>
          {update.isPending && <Spinner />}
          {tc("actions.save")}
        </Button>
      </div>
    </form>
  );
}
