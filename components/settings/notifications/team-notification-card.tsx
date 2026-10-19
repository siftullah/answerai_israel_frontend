"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
  RECIPIENT_RULES_MAX_RULES,
  recipientRulesSchema,
  recipientRulesServerErrorKey,
  toRecipientRulesPayload,
  toRecipientRulesValues,
  type RecipientRulesValues,
} from "@/lib/validation/recipient-rules";

/**
 * The per-notification wording: what fires it, where it goes by default,
 * example rules. Already translated — every sentence that names the routed
 * thing is spelled out per notification.
 */
export interface TeamNotificationSectionCopy {
  type: TeamNotificationType;
  title: string;
  description: string;
  /** Says where the email goes with routing off — so the switch is never a mystery. */
  enabledDescription: string;
  recipientsDescription: string;
  rulesDescription: string;
  rulesEmpty: string;
  /** "Test with the latest lead". */
  testLabel: string;
  /** Toast when the test routes to nobody and the assistant gave no reason. */
  testNobody: string;
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
  const t = useTranslations("settings.notifications.card");
  const tc = useTranslations("common");
  const membersQuery = useMembers(businessUuid);
  const update = useUpdateTeamNotificationSettings(businessUuid, copy.type);
  const runTest = useTestTeamNotificationRouting(copy.type);
  const [testResult, setTestResult] = useState<TeamNotificationTestResult | null>(null);

  const tv = useTranslations("validation");
  const schema = useMemo(() => recipientRulesSchema(tv), [tv]);
  const form = useForm<RecipientRulesValues>({
    resolver: zodResolver(schema),
    defaultValues: toRecipientRulesValues(settings),
  });
  const { errors, isDirty } = form.formState;
  const enabled = form.watch("enabled");

  const fieldsCopy: RecipientRulesCopy = {
    enabledLabel: t("enabledLabel"),
    enabledDescription: copy.enabledDescription,
    recipientsTitle: t("recipientsTitle"),
    recipientsDescription: copy.recipientsDescription,
    customEmailsDescription: t("customEmailsDescription"),
    rulesTitle: t("rulesTitle"),
    rulesDescription: copy.rulesDescription,
    rulesEmpty: copy.rulesEmpty,
    rulePlaceholders: copy.rulePlaceholders,
    rulesLimitNote: t("rulesLimitNote", { count: RECIPIENT_RULES_MAX_RULES }),
  };

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(toRecipientRulesPayload(values), {
      onSuccess: (result) => {
        form.reset(toRecipientRulesValues(result));
        setTestResult(null);
        toast.success(t("toasts.saved", { title: copy.title }));
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
          toast.info(result.reason ?? copy.testNobody);
        }
      },
      onError: (error) => toast.error(error.message),
    });
  };

  // Tests run against the SAVED settings, so unsaved edits can't be previewed.
  const testTooltip = !enabled
    ? t("testTooltip.disabled")
    : isDirty
      ? t("testTooltip.unsaved")
      : null;
  const testDisabled = testTooltip !== null || update.isPending || runTest.isPending;

  const testButton = (
    <Button type="button" variant="outline" disabled={testDisabled} onClick={test}>
      {runTest.isPending && <Spinner />}
      {copy.testLabel}
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
                  ? t("testResult.routed", { recipients: testResult.recipients.join(", ") })
                  : t("testResult.nobody")}
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
                {tc("actions.discard")}
              </Button>
            )}
            <Button type="submit" disabled={!isDirty || update.isPending}>
              {update.isPending && <Spinner />}
              {tc("actions.save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
