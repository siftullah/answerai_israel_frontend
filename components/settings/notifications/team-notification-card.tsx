"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  RecipientRulesFields,
  type RecipientRulesCopy,
} from "@/components/settings/notifications/recipient-rules-fields";
import {
  useTestTeamNotificationRouting,
  useUpdateTeamNotificationSettings,
} from "@/hooks/use-team-notification-settings";
import { useMembers } from "@/hooks/use-members";
import type {
  TeamNotificationSettings,
  TeamNotificationTestResult,
  TeamNotificationType,
} from "@/lib/api/types";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import {
  recipientRulesSchema,
  recipientRulesServerErrorKey,
  toRecipientRulesPayload,
  toRecipientRulesValues,
  type RecipientRulesValues,
} from "@/lib/validation/recipient-rules";

/** The per-notification wording: what fires it, where it goes by default, example rules. */
export interface TeamNotificationSectionCopy {
  type: TeamNotificationType;
  title: string;
  description: string;
  /** Where the email goes with routing off — shown so the switch is never a mystery. */
  defaultRecipient: string;
  /** The thing being routed, singular, for the test button's wording. */
  noun: string;
  rulePlaceholders: string[];
}

/**
 * One notification's routing: its own query slice, form and save. The "test"
 * button routes the latest real record under the SAVED settings and shows who
 * it would have gone to — the way to tune rules without waiting for a call.
 */
export function TeamNotificationCard({
  businessUuid,
  settings,
  copy,
}: {
  businessUuid: string;
  settings: TeamNotificationSettings;
  copy: TeamNotificationSectionCopy;
}) {
  const membersQuery = useMembers(businessUuid);
  const update = useUpdateTeamNotificationSettings(businessUuid, copy.type);
  const runTest = useTestTeamNotificationRouting(copy.type);
  const [testResult, setTestResult] = useState<TeamNotificationTestResult | null>(null);

  const form = useForm<RecipientRulesValues>({
    resolver: zodResolver(recipientRulesSchema),
    defaultValues: toRecipientRulesValues(settings),
  });
  const { errors, isDirty } = form.formState;
  const enabled = form.watch("enabled");

  const fieldsCopy: RecipientRulesCopy = {
    enabledLabel: "Let an assistant choose who receives it",
    enabledDescription: `When off, ${copy.defaultRecipient} Your recipients and rules are kept for when you turn it back on.`,
    recipientsTitle: "Who it may go to",
    recipientsDescription: `The people the assistant can choose from. It picks who actually gets each ${copy.noun} from your rules and their roles — usually one person, not everyone.`,
    customEmailsDescription: "Anyone else who may receive it, such as a shared inbox.",
    rulesTitle: "Rules for the assistant",
    rulesDescription: `Plain-English instructions for which ${copy.noun}s go to whom, and which should go to nobody.`,
    rulesEmpty: `No rules yet — the assistant will go by each person's role to decide who should get each ${copy.noun}. Add rules to tell it how to route them.`,
    rulePlaceholders: copy.rulePlaceholders,
    rulesLimitNote: "Up to 20 rules per notification.",
  };

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(toRecipientRulesPayload(values), {
      onSuccess: (result) => {
        form.reset(toRecipientRulesValues(result));
        setTestResult(null);
        toast.success(`${copy.title} settings saved`);
      },
      onError: (error) => {
        applyServerErrors(form, error, { mapKey: recipientRulesServerErrorKey });
        toast.error(error.message);
      },
    });
  });

  const test = () => {
    runTest.mutate(undefined, {
      onSuccess: (result) => {
        setTestResult(result);
        if (!result.routed) {
          toast.info(result.reason ?? `The assistant would have sent that ${copy.noun} to nobody.`);
        }
      },
      onError: (error) => toast.error(error.message),
    });
  };

  // Tests run against the SAVED settings, so unsaved edits can't be previewed.
  const testTooltip = !enabled
    ? "Turn routing on and save to test it."
    : isDirty
      ? "Save your changes first — tests use the saved settings."
      : null;
  const testDisabled = testTooltip !== null || update.isPending || runTest.isPending;

  const testButton = (
    <Button type="button" variant="outline" disabled={testDisabled} onClick={test}>
      {runTest.isPending && <Spinner />}
      Test with the latest {copy.noun}
    </Button>
  );

  return (
    <Card id={copy.type}>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription className="mt-1">{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          {errors.root?.server && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.server.message}</AlertDescription>
            </Alert>
          )}

          <RecipientRulesFields
            form={form}
            idPrefix={copy.type}
            membersQuery={membersQuery}
            copy={fieldsCopy}
          />

          {testResult && (
            <Alert>
              <AlertTitle>
                {testResult.routed
                  ? `Would go to ${testResult.recipients.join(", ")}`
                  : "Would go to nobody"}
              </AlertTitle>
              <AlertDescription>
                <p>
                  <span className="font-medium text-foreground">
                    {testResult.record.label}
                  </span>
                  {testResult.reason ? ` — ${testResult.reason}` : ""}
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {testTooltip ? (
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>{testButton}</TooltipTrigger>
                <TooltipContent className="max-w-64">{testTooltip}</TooltipContent>
              </Tooltip>
            ) : (
              testButton
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
      </CardContent>
    </Card>
  );
}
