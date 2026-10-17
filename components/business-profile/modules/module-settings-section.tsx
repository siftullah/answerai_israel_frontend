"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useBusiness } from "@/components/business/business-provider";
import { useBusinessProfile, useUpdateBusinessProfile } from "@/hooks/use-business-profile";
import { useModuleSettings, useUpdateModuleSettings } from "@/hooks/use-modules";
import type {
  InvoiceModuleSettings,
  JobModuleSettings,
  LeadModuleSettings,
  QuoteModuleSettings,
} from "@/lib/api/types";

/**
 * Editable per-module settings, shown under the toggle cards. Tax lives on
 * the business profile (shared by invoices and quotes); the per-module cards
 * write their module's whole settings bag (the endpoint replaces, not merges).
 */
export function ModuleSettingsSection() {
  const { business, modules } = useBusiness();
  const enabled = new Set(modules.filter((module) => module.enabled).map((module) => module.key));

  const quotesOn = enabled.has("quotes");
  const invoicesOn = enabled.has("invoices");
  const leadsOn = enabled.has("leads");
  const jobsOn = enabled.has("jobs");

  if (!quotesOn && !invoicesOn && !leadsOn && !jobsOn) return null;

  return (
    <>
      {(quotesOn || invoicesOn) && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-semibold">Billing defaults</h2>
            <p className="text-sm text-muted-foreground">
              Used whenever a quote or invoice is raised — each document can still override them.
            </p>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            {quotesOn && <QuoteSettingsCard businessUuid={business.id} />}
            {invoicesOn && <InvoiceSettingsCard businessUuid={business.id} />}
            <TaxDefaultsCard businessUuid={business.id} />
          </div>
        </div>
      )}

      {leadsOn && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-semibold">Lead capture</h2>
            <p className="text-sm text-muted-foreground">
              How leads get logged from your agent&apos;s calls.
            </p>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <LeadSettingsCard businessUuid={business.id} />
          </div>
        </div>
      )}

      {jobsOn && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-semibold">Job scheduling</h2>
            <p className="text-sm text-muted-foreground">
              How job visits get booked, on calls and in the portal.
            </p>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <JobSettingsCard businessUuid={business.id} />
          </div>
        </div>
      )}
    </>
  );
}

function SettingsCardSkeleton() {
  return <Skeleton className="h-56 w-full rounded-xl" />;
}

/** "10" ⇄ 1000bp, keeping up to two decimals ("10.5" → 1050). */
function percentToBp(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(trimmed)) return null;
  const bp = Math.round(Number(trimmed) * 100);
  return bp >= 0 && bp <= 10000 ? bp : null;
}

function bpToPercent(bp: number): string {
  return String(bp / 100);
}

function TaxDefaultsCard({ businessUuid }: { businessUuid: string }) {
  const profileQuery = useBusinessProfile(businessUuid);

  if (profileQuery.isPending) return <SettingsCardSkeleton />;
  if (profileQuery.isError) return null;

  return (
    <TaxDefaultsForm
      businessUuid={businessUuid}
      initialLabel={profileQuery.data.tax_label}
      initialPercent={bpToPercent(profileQuery.data.tax_rate_bp)}
    />
  );
}

function TaxDefaultsForm({
  businessUuid,
  initialLabel,
  initialPercent,
}: {
  businessUuid: string;
  initialLabel: string;
  initialPercent: string;
}) {
  const updateProfile = useUpdateBusinessProfile(businessUuid);

  const [label, setLabel] = useState(initialLabel);
  const [percent, setPercent] = useState(initialPercent);
  const [error, setError] = useState<string | null>(null);

  const dirty = label !== initialLabel || percent !== initialPercent;

  const save = () => {
    const bp = percentToBp(percent);
    if (bp === null) {
      setError("Enter a rate between 0 and 100, like 10 or 12.5");
      return;
    }
    if (label.trim() === "" || label.trim().length > 20) {
      setError("Give the tax a short name, like GST");
      return;
    }

    updateProfile.mutate(
      { tax_label: label.trim(), tax_rate_bp: bp },
      {
        onSuccess: () => toast.success("Tax defaults saved"),
        onError: (mutationError) => toast.error(mutationError.message),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#30aece]">Tax</CardTitle>
        <CardDescription>
          The default rate applied to new line items on quotes and invoices.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor="tax-label">Tax name</FieldLabel>
          <Input
            id="tax-label"
            value={label}
            maxLength={20}
            onChange={(event) => {
              setLabel(event.target.value);
              setError(null);
            }}
            placeholder="GST"
          />
        </Field>
        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor="tax-rate">Rate (%)</FieldLabel>
          <Input
            id="tax-rate"
            inputMode="decimal"
            value={percent}
            onChange={(event) => {
              setPercent(event.target.value);
              setError(null);
            }}
            placeholder="10"
          />
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>10% GST for most Australian businesses.</FieldDescription>
          )}
        </Field>
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" onClick={save} disabled={!dirty || updateProfile.isPending}>
          {updateProfile.isPending ? "Saving…" : "Save tax defaults"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function LeadSettingsCard({ businessUuid }: { businessUuid: string }) {
  const settingsQuery = useModuleSettings<LeadModuleSettings>(businessUuid, "leads");

  if (settingsQuery.isPending) return <SettingsCardSkeleton />;
  if (settingsQuery.isError) return null;

  return <LeadSettingsForm businessUuid={businessUuid} initial={settingsQuery.data} />;
}

function LeadSettingsForm({
  businessUuid,
  initial,
}: {
  businessUuid: string;
  initial: LeadModuleSettings;
}) {
  const updateSettings = useUpdateModuleSettings(businessUuid, "leads");

  const [autoCreate, setAutoCreate] = useState(initial.auto_create_lead_on_inbound);

  const dirty = autoCreate !== initial.auto_create_lead_on_inbound;

  const save = () => {
    updateSettings.mutate(
      { auto_create_lead_on_inbound: autoCreate },
      {
        onSuccess: () => toast.success("Lead settings saved"),
        onError: (mutationError) => toast.error(mutationError.message),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#30aece]">Leads</CardTitle>
        <CardDescription>How leads are captured from inbound calls.</CardDescription>
      </CardHeader>
      <CardContent>
        <Field orientation="horizontal">
          <div className="flex flex-col gap-0.5">
            <FieldLabel htmlFor="lead-auto-create">Auto-create from inbound calls</FieldLabel>
            <FieldDescription>
              After an inbound call with no open lead for the caller, log a new one
              automatically. Your agent can always log leads with its create_lead tool.
            </FieldDescription>
          </div>
          <Switch
            id="lead-auto-create"
            checked={autoCreate}
            onCheckedChange={(checked) => setAutoCreate(checked === true)}
          />
        </Field>
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" onClick={save} disabled={!dirty || updateSettings.isPending}>
          {updateSettings.isPending ? "Saving…" : "Save lead settings"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function JobSettingsCard({ businessUuid }: { businessUuid: string }) {
  const settingsQuery = useModuleSettings<JobModuleSettings>(businessUuid, "jobs");

  if (settingsQuery.isPending) return <SettingsCardSkeleton />;
  if (settingsQuery.isError) return null;

  return <JobSettingsForm businessUuid={businessUuid} initial={settingsQuery.data} />;
}

function JobSettingsForm({
  businessUuid,
  initial,
}: {
  businessUuid: string;
  initial: JobModuleSettings;
}) {
  const updateSettings = useUpdateModuleSettings(businessUuid, "jobs");

  const [allowScheduling, setAllowScheduling] = useState(initial.allow_agent_scheduling);
  const [defaultMinutes, setDefaultMinutes] = useState(String(initial.default_estimated_minutes));
  const [error, setError] = useState<string | null>(null);

  const dirty =
    allowScheduling !== initial.allow_agent_scheduling ||
    defaultMinutes !== String(initial.default_estimated_minutes);

  const save = () => {
    const minutes = Number(defaultMinutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      setError("Enter whole minutes between 1 and 1440");
      return;
    }

    updateSettings.mutate(
      {
        allow_agent_scheduling: allowScheduling,
        default_estimated_minutes: minutes,
      },
      {
        onSuccess: () => toast.success("Job settings saved"),
        onError: (mutationError) => toast.error(mutationError.message),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#30aece]">Jobs</CardTitle>
        <CardDescription>How job visits get booked.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field orientation="horizontal">
          <div className="flex flex-col gap-0.5">
            <FieldLabel htmlFor="job-allow-agent-scheduling">
              Let the agent book visits on calls
            </FieldLabel>
            <FieldDescription>
              Your agent offers free slots and books job visits with its check_job_availability
              and book_job tools. Off = it still logs jobs, but the team confirms the time.
            </FieldDescription>
          </div>
          <Switch
            id="job-allow-agent-scheduling"
            checked={allowScheduling}
            onCheckedChange={(checked) => setAllowScheduling(checked === true)}
          />
        </Field>
        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor="job-default-minutes">Default visit length (minutes)</FieldLabel>
          <Input
            id="job-default-minutes"
            inputMode="numeric"
            value={defaultMinutes}
            onChange={(event) => {
              setDefaultMinutes(event.target.value);
              setError(null);
            }}
            className="max-w-28"
          />
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>
              Used when a job has no estimate — for offered slots and booked windows.
            </FieldDescription>
          )}
        </Field>
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" onClick={save} disabled={!dirty || updateSettings.isPending}>
          {updateSettings.isPending ? "Saving…" : "Save job settings"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function QuoteSettingsCard({ businessUuid }: { businessUuid: string }) {
  const settingsQuery = useModuleSettings<QuoteModuleSettings>(businessUuid, "quotes");

  if (settingsQuery.isPending) return <SettingsCardSkeleton />;
  if (settingsQuery.isError) return null;

  return <QuoteSettingsForm businessUuid={businessUuid} initial={settingsQuery.data} />;
}

function QuoteSettingsForm({
  businessUuid,
  initial,
}: {
  businessUuid: string;
  initial: QuoteModuleSettings;
}) {
  const updateSettings = useUpdateModuleSettings(businessUuid, "quotes");

  const [validDays, setValidDays] = useState(String(initial.valid_days));
  const [terms, setTerms] = useState(initial.terms ?? "");
  const [fromDetails, setFromDetails] = useState(initial.from_details ?? "");
  const [error, setError] = useState<string | null>(null);

  const dirty =
    validDays !== String(initial.valid_days) ||
    terms !== (initial.terms ?? "") ||
    fromDetails !== (initial.from_details ?? "");

  const save = () => {
    const days = Number(validDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setError("Enter a whole number of days between 1 and 365");
      return;
    }

    updateSettings.mutate(
      {
        valid_days: days,
        terms: terms.trim() || null,
        from_details: fromDetails.trim() || null,
      },
      {
        onSuccess: () => toast.success("Quote settings saved"),
        onError: (mutationError) => toast.error(mutationError.message),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#30aece]">Quotes</CardTitle>
        <CardDescription>Defaults for new quotes.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor="quote-valid-days">Validity (days)</FieldLabel>
          <Input
            id="quote-valid-days"
            inputMode="numeric"
            value={validDays}
            onChange={(event) => {
              setValidDays(event.target.value);
              setError(null);
            }}
            className="max-w-28"
          />
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>
              How long a sent quote stays open before it expires.
            </FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="quote-default-terms">Default terms</FieldLabel>
          <Textarea
            id="quote-default-terms"
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
            rows={3}
            maxLength={5000}
            placeholder="Scope of work, exclusions, payment terms…"
          />
          <FieldDescription>Pre-filled on every new quote; editable per quote.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="quote-from-details">From details</FieldLabel>
          <Textarea
            id="quote-from-details"
            value={fromDetails}
            onChange={(event) => setFromDetails(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="ABN, trading name, address — shown on the quote footer"
          />
        </Field>
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" onClick={save} disabled={!dirty || updateSettings.isPending}>
          {updateSettings.isPending ? "Saving…" : "Save quote settings"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function InvoiceSettingsCard({ businessUuid }: { businessUuid: string }) {
  const settingsQuery = useModuleSettings<InvoiceModuleSettings>(businessUuid, "invoices");

  if (settingsQuery.isPending) return <SettingsCardSkeleton />;
  if (settingsQuery.isError) return null;

  return <InvoiceSettingsForm businessUuid={businessUuid} initial={settingsQuery.data} />;
}

function InvoiceSettingsForm({
  businessUuid,
  initial,
}: {
  businessUuid: string;
  initial: InvoiceModuleSettings;
}) {
  const updateSettings = useUpdateModuleSettings(businessUuid, "invoices");

  const [netDays, setNetDays] = useState(String(initial.net_days));
  const [paymentInstructions, setPaymentInstructions] = useState(
    initial.payment_instructions ?? ""
  );
  const [fromDetails, setFromDetails] = useState(initial.from_details ?? "");
  const [error, setError] = useState<string | null>(null);

  const dirty =
    netDays !== String(initial.net_days) ||
    paymentInstructions !== (initial.payment_instructions ?? "") ||
    fromDetails !== (initial.from_details ?? "");

  const save = () => {
    const days = Number(netDays);
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      setError("Enter a whole number of days between 0 and 365");
      return;
    }

    updateSettings.mutate(
      {
        net_days: days,
        payment_instructions: paymentInstructions.trim() || null,
        from_details: fromDetails.trim() || null,
      },
      {
        onSuccess: () => toast.success("Invoice settings saved"),
        onError: (mutationError) => toast.error(mutationError.message),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#30aece]">Invoices</CardTitle>
        <CardDescription>Defaults for new invoices.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor="invoice-net-days">Payment terms (days)</FieldLabel>
          <Input
            id="invoice-net-days"
            inputMode="numeric"
            value={netDays}
            onChange={(event) => {
              setNetDays(event.target.value);
              setError(null);
            }}
            className="max-w-28"
          />
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>
              Sending an invoice sets its due date this many days after issue.
            </FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="invoice-payment-instructions">Payment instructions</FieldLabel>
          <Textarea
            id="invoice-payment-instructions"
            value={paymentInstructions}
            onChange={(event) => setPaymentInstructions(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Direct deposit — BSB, account number, reference…"
          />
          <FieldDescription>Pre-filled on every new invoice; editable per invoice.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="invoice-from-details">From details</FieldLabel>
          <Textarea
            id="invoice-from-details"
            value={fromDetails}
            onChange={(event) => setFromDetails(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="ABN, trading name, address — shown on the invoice footer"
          />
        </Field>
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" onClick={save} disabled={!dirty || updateSettings.isPending}>
          {updateSettings.isPending ? "Saving…" : "Save invoice settings"}
        </Button>
      </CardFooter>
    </Card>
  );
}
