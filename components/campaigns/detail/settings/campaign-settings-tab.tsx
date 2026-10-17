"use client";

import { useEffect } from "react";
import { Controller, FormProvider, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusiness } from "@/components/business/business-provider";
import { ChoiceCards } from "@/components/business-profile/choice-cards";
import { WeeklyHoursEditor } from "@/components/business-profile/weekly-hours-editor";
import {
  CampaignBasicsFields,
  CampaignPacingFields,
  CampaignScheduleFields,
} from "@/components/campaigns/campaign-form-fields";
import { UnsavedChangesBar } from "@/components/unsaved-changes-bar";
import { useAgent, useAgents } from "@/hooks/use-agents";
import { useUpdateCampaign } from "@/hooks/use-campaigns";
import { usePhoneNumbers } from "@/hooks/use-phone-numbers";
import type { Agent, Campaign, PhoneNumber } from "@/lib/api/types";
import { TERMINAL_CAMPAIGN_STATUSES } from "@/lib/api/types";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { callablePhoneNumbers } from "@/lib/validation/call";
import { agentCallVariables } from "@/lib/validation/agent";
import {
  campaignReadyAgents,
  campaignServerFieldKey,
  campaignSettingsSchema,
  toCampaignSettingsPayload,
  toCampaignSettingsValues,
  type CampaignSettingsValues,
} from "@/lib/validation/campaign";

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
      <div>
        <h3 className="text-base font-medium">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Keep the saved pick selectable even when it's no longer eligible —
 * otherwise the Select renders its raw uuid. */
function withSaved<T extends { id: string }>(
  eligible: T[],
  all: T[] | undefined,
  savedId: string | undefined
): T[] {
  if (!savedId || eligible.some((item) => item.id === savedId)) return eligible;
  const saved = (all ?? []).find((item) => item.id === savedId);
  return saved ? [...eligible, saved] : eligible;
}

export function CampaignSettingsTab({ campaign }: { campaign: Campaign }) {
  const { business } = useBusiness();
  const updateCampaign = useUpdateCampaign(business.id, campaign.id);
  const agentsQuery = useAgents(business.id);
  const numbersQuery = usePhoneNumbers(business.id);

  const locked = TERMINAL_CAMPAIGN_STATUSES.includes(campaign.status);

  // Mounted under CampaignDetailBody key={campaign.id}, so defaults are read
  // exactly once per campaign — 4s polling can never clobber in-flight edits.
  const form = useForm<CampaignSettingsValues>({
    resolver: zodResolver(campaignSettingsSchema),
    defaultValues: toCampaignSettingsValues(campaign, business.timezone),
  });
  const hoursMode = form.watch("hours_mode");
  const { errors } = form.formState;

  const agents: Agent[] = withSaved(
    campaignReadyAgents(agentsQuery.data),
    agentsQuery.data,
    campaign.agent?.id
  );
  const numbers: PhoneNumber[] = withSaved(
    callablePhoneNumbers(numbersQuery.data),
    numbersQuery.data,
    campaign.caller_number?.id
  );

  const submit = form.handleSubmit((values) => {
    updateCampaign.mutate(toCampaignSettingsPayload(values, business.timezone), {
      onSuccess: (updated) => {
        toast.success("Campaign updated");
        form.reset(toCampaignSettingsValues(updated, business.timezone));
      },
      onError: (error) =>
        applyServerErrors(form, error, { mapKey: campaignServerFieldKey }),
    });
  });

  const rootServerError = (
    errors.root as Record<string, { message?: string }> | undefined
  )?.server;

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={submit}>
        {/* One fieldset disables every native control — inputs, selects,
            switches, ChoiceCards buttons — when the campaign is terminal. */}
        <fieldset disabled={locked} className="flex min-w-0 flex-col gap-4">
          {locked && (
            <Alert>
              <AlertDescription>
                This campaign has finished — settings are read-only. Duplicate it to run
                the same setup again.
              </AlertDescription>
            </Alert>
          )}
          {rootServerError && (
            <Alert variant="destructive">
              <AlertDescription>{rootServerError.message}</AlertDescription>
            </Alert>
          )}

          <SettingsSection
            title="Basics"
            description="The agent doing the talking and the number on the caller ID."
          >
            <CampaignBasicsFields agents={agents} numbers={numbers} />
          </SettingsSection>

          <SettingsSection
            title="Schedule"
            description="An optional window — dialing starts and stops on its own."
          >
            <CampaignScheduleFields />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => {
                for (const name of [
                  "start_date",
                  "start_time",
                  "end_date",
                  "end_time",
                ] as const) {
                  form.setValue(name, "", { shouldDirty: true });
                }
              }}
            >
              Clear schedule
            </Button>
          </SettingsSection>

          <SettingsSection
            title="Calling hours"
            description="When the campaign is allowed to dial. Outside these windows it simply waits."
          >
            <Controller
              control={form.control}
              name="hours_mode"
              render={({ field }) => (
                <ChoiceCards
                  value={field.value}
                  onChange={field.onChange}
                  className="sm:grid-cols-2"
                  options={[
                    {
                      value: "inherit",
                      label: "Business hours",
                      description: "Follows your trading hours.",
                    },
                    {
                      value: "custom",
                      label: "Custom hours",
                      description: "Set specific days and times for this campaign.",
                    },
                  ]}
                />
              )}
            />
            {hoursMode === "custom" && (
              <Field data-invalid={!!errors.calling_hours || undefined}>
                <Controller
                  control={form.control}
                  name="calling_hours"
                  render={({ field }) => (
                    <WeeklyHoursEditor value={field.value} onChange={field.onChange} />
                  )}
                />
                {errors.calling_hours && (
                  <FieldError>
                    {(errors.calling_hours as { message?: string }).message}
                  </FieldError>
                )}
              </Field>
            )}
          </SettingsSection>

          <SettingsSection
            title="Pacing & retries"
            description="How hard the campaign pushes, and what counts as worth another try."
          >
            <CampaignPacingFields />
          </SettingsSection>

          <SettingsSection
            title="Default variables"
            description="Campaign-wide values for the agent's placeholders. Per-recipient values override these."
          >
            <DefaultVariablesSection businessUuid={business.id} />
          </SettingsSection>
        </fieldset>

        {!locked && (
          <UnsavedChangesBar
            onSave={submit}
            onDiscard={() => form.reset()}
            saving={updateCampaign.isPending}
          />
        )}
      </form>
    </FormProvider>
  );
}

function DefaultVariablesSection({ businessUuid }: { businessUuid: string }) {
  const form = useFormContext<CampaignSettingsValues>();
  const agentId = form.watch("agent_id");

  if (agentId === "") {
    return (
      <p className="text-sm text-muted-foreground">
        Pick an agent first — its declared variables appear here.
      </p>
    );
  }
  // Remount per agent so the field array re-keys to the new declared set.
  return <DefaultVariablesFields key={agentId} businessUuid={businessUuid} agentId={agentId} />;
}

function DefaultVariablesFields({
  businessUuid,
  agentId,
}: {
  businessUuid: string;
  agentId: string;
}) {
  const form = useFormContext<CampaignSettingsValues>();
  const agentQuery = useAgent(businessUuid, agentId);
  const declared = agentCallVariables(agentQuery.data?.config);
  const declaredKey = declared.map((variable) => variable.name).join(",");

  // Re-key the pairs to the agent's declared set whenever they diverge —
  // initial load, agent swap, or a post-save reset (the saved record only
  // keeps non-empty values). Surviving values are kept, unknown names dropped
  // (the backend rejects them), new ones start empty. Quiet on dirtiness:
  // agent swaps already dirty the form via agent_id.
  const pairs = form.watch("default_variables");
  const pairsKey = pairs.map((pair) => pair.name).join(",");
  useEffect(() => {
    if (agentQuery.isPending || pairsKey === declaredKey) return;
    const current = new Map(
      form.getValues("default_variables").map((pair) => [pair.name, pair.value])
    );
    // resetField (not setValue): re-keying is bookkeeping, not a user edit —
    // it swaps the field's default too, so the save bar stays honest.
    form.resetField("default_variables", {
      defaultValue: declared.map((variable) => ({
        name: variable.name,
        value: current.get(variable.name) ?? "",
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentQuery.isPending, declaredKey, pairsKey]);

  if (agentQuery.isPending) {
    return <Skeleton className="h-16 w-full" />;
  }

  if (declared.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This agent has no variables to set per campaign. Built-ins like {"{{contact_name}}"}{" "}
        and {"{{business_name}}"} are filled automatically on every call.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-2">
        {pairs.map((pair, index) => (
          <Field key={pair.name}>
            <FieldLabel htmlFor={`campaign-variable-${pair.name}`} className="font-mono">
              {pair.name}
            </FieldLabel>
            <Input
              id={`campaign-variable-${pair.name}`}
              placeholder="Fallback for recipients without their own value"
              autoComplete="off"
              {...form.register(`default_variables.${index}.value`)}
            />
          </Field>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        A recipient with no value for a variable, here or on its own row, is skipped rather
        than called. The agent&apos;s own default is never used for campaign calls.
      </p>
    </div>
  );
}
