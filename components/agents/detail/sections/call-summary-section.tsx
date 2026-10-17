"use client";

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

const COPY: RecipientRulesCopy = {
  enabledLabel: "Send call summary emails",
  enabledDescription:
    "When off, nothing is sent — your recipients and rules are kept for when you turn it back on.",
  recipientsTitle: "Who receives them",
  recipientsDescription:
    "The people the assistant may write to. It decides who actually hears about each call from your rules and their roles — not everyone gets every call.",
  customEmailsDescription: "Anyone else who should receive summaries, such as a shared inbox.",
  rulesTitle: "Rules for the assistant",
  rulesDescription:
    "Plain-English instructions for who should hear about which calls, what each email should cover, and which calls to skip.",
  rulesEmpty:
    "No rules yet — the assistant will go by each person's role to decide who needs a call. Add rules to tell it how calls should be routed and written up.",
  rulePlaceholders: [
    "Send repair and maintenance requests to the property management team at pm@example.com",
    "Skip the summary for wrong numbers and sales calls to us",
    "Always include the property address when one is mentioned",
  ],
  rulesLimitNote: "Up to 20 rules per agent.",
};

/**
 * Standalone card: its own query, form and save — deliberately outside the
 * versioned agent config, so saving here never republishes to the voice
 * engine or dirties the page-level save bar.
 */
export function CallSummarySection({ agent }: { agent: Agent }) {
  const { business } = useBusiness();
  const settingsQuery = useAgentCallSummarySettings(business.id, agent.id);

  return (
    <AgentSection
      id="call-summary"
      title="Call summary emails"
      description="After each call, an AI assistant reads the transcript, decides who on your team needs to hear about it, and writes each of them an email tailored to what the call was about."
    >
      {settingsQuery.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : settingsQuery.isError ? (
        <ErrorState
          title="Couldn't load call summary settings"
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

  const form = useForm<RecipientRulesValues>({
    resolver: zodResolver(recipientRulesSchema),
    defaultValues: toRecipientRulesValues(settings),
    disabled: archived,
  });
  const { errors, isDirty } = form.formState;
  const enabled = form.watch("enabled");

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(toRecipientRulesPayload(values), {
      onSuccess: (result) => {
        form.reset(toRecipientRulesValues(result));
        toast.success("Call summary settings saved");
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
          const count = result.emails.length;
          toast.success(
            `${count === 1 ? "Sample email" : `${count} sample emails`} sent to ${result.sent_to}`
          );
        } else {
          toast.info(
            result.reason ?? "The assistant decided nobody needed to hear about that call."
          );
        }
      },
      onError: (error) => toast.error(error.message),
    });
  };

  // Samples are built from the SAVED settings, so unsaved edits can't be previewed.
  const sampleTooltip = archived
    ? "Restore the agent to send a sample."
    : !enabled
      ? "Turn on call summary emails and save to send a sample."
      : isDirty
        ? "Save your changes first — samples use the saved settings."
        : null;
  const sampleDisabled = sampleTooltip !== null || update.isPending || sendTest.isPending;

  const sampleButton = (
    <Button type="button" variant="outline" disabled={sampleDisabled} onClick={sendSample}>
      {sendTest.isPending && <Spinner />}
      Send me a sample
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
        copy={COPY}
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
            Discard
          </Button>
        )}
        <Button type="submit" disabled={!isDirty || update.isPending}>
          {update.isPending && <Spinner />}
          Save
        </Button>
      </div>
    </form>
  );
}
