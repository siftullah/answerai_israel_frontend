"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("businessProfile.moduleSettings");
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
            <h2 className="font-heading text-lg font-semibold">{t("billing.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("billing.description")}
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
            <h2 className="font-heading text-lg font-semibold">{t("leadCapture.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("leadCapture.description")}
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
            <h2 className="font-heading text-lg font-semibold">{t("jobScheduling.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("jobScheduling.description")}
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
  const t = useTranslations("businessProfile.moduleSettings");
  const tc = useTranslations("common");
  const updateProfile = useUpdateBusinessProfile(businessUuid);

  const [label, setLabel] = useState(initialLabel);
  const [percent, setPercent] = useState(initialPercent);
  const [error, setError] = useState<string | null>(null);

  const dirty = label !== initialLabel || percent !== initialPercent;

  const save = () => {
    const bp = percentToBp(percent);
    if (bp === null) {
      setError(t("tax.errors.rate"));
      return;
    }
    if (label.trim() === "" || label.trim().length > 20) {
      setError(t("tax.errors.name"));
      return;
    }

    updateProfile.mutate(
      { tax_label: label.trim(), tax_rate_bp: bp },
      {
        onSuccess: () => toast.success(t("tax.toasts.saved")),
        onError: (mutationError) => toast.error(mutationError.message),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#30aece]">{tc("labels.tax")}</CardTitle>
        <CardDescription>
          {t("tax.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor="tax-label">{t("tax.name")}</FieldLabel>
          <Input
            id="tax-label"
            value={label}
            maxLength={20}
            onChange={(event) => {
              setLabel(event.target.value);
              setError(null);
            }}
            placeholder={t("tax.namePlaceholder")}
          />
        </Field>
        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor="tax-rate">{t("tax.rate")}</FieldLabel>
          <Input
            id="tax-rate"
            inputMode="decimal"
            value={percent}
            onChange={(event) => {
              setPercent(event.target.value);
              setError(null);
            }}
            placeholder={t("tax.ratePlaceholder")}
          />
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>{t("tax.rateHint")}</FieldDescription>
          )}
        </Field>
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" onClick={save} disabled={!dirty || updateProfile.isPending}>
          {updateProfile.isPending ? tc("actions.saving") : t("tax.save")}
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
  const t = useTranslations("businessProfile.moduleSettings");
  const tc = useTranslations("common");
  const updateSettings = useUpdateModuleSettings(businessUuid, "leads");

  const [autoCreate, setAutoCreate] = useState(initial.auto_create_lead_on_inbound);

  const dirty = autoCreate !== initial.auto_create_lead_on_inbound;

  const save = () => {
    updateSettings.mutate(
      { auto_create_lead_on_inbound: autoCreate },
      {
        onSuccess: () => toast.success(t("leads.toasts.saved")),
        onError: (mutationError) => toast.error(mutationError.message),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#30aece]">{t("leads.title")}</CardTitle>
        <CardDescription>{t("leads.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Field orientation="horizontal">
          <div className="flex flex-col gap-0.5">
            <FieldLabel htmlFor="lead-auto-create">{t("leads.autoCreate")}</FieldLabel>
            <FieldDescription>
              {t("leads.autoCreateHint")}
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
          {updateSettings.isPending ? tc("actions.saving") : t("leads.save")}
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
  const t = useTranslations("businessProfile.moduleSettings");
  const tc = useTranslations("common");
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
      setError(t("jobs.errors.minutes"));
      return;
    }

    updateSettings.mutate(
      {
        allow_agent_scheduling: allowScheduling,
        default_estimated_minutes: minutes,
      },
      {
        onSuccess: () => toast.success(t("jobs.toasts.saved")),
        onError: (mutationError) => toast.error(mutationError.message),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#30aece]">{t("jobs.title")}</CardTitle>
        <CardDescription>{t("jobs.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field orientation="horizontal">
          <div className="flex flex-col gap-0.5">
            <FieldLabel htmlFor="job-allow-agent-scheduling">
              {t("jobs.allowScheduling")}
            </FieldLabel>
            <FieldDescription>
              {t("jobs.allowSchedulingHint")}
            </FieldDescription>
          </div>
          <Switch
            id="job-allow-agent-scheduling"
            checked={allowScheduling}
            onCheckedChange={(checked) => setAllowScheduling(checked === true)}
          />
        </Field>
        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor="job-default-minutes">{t("jobs.defaultMinutes")}</FieldLabel>
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
              {t("jobs.defaultMinutesHint")}
            </FieldDescription>
          )}
        </Field>
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" onClick={save} disabled={!dirty || updateSettings.isPending}>
          {updateSettings.isPending ? tc("actions.saving") : t("jobs.save")}
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
  const t = useTranslations("businessProfile.moduleSettings");
  const tc = useTranslations("common");
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
      setError(t("quotes.errors.validDays"));
      return;
    }

    updateSettings.mutate(
      {
        valid_days: days,
        terms: terms.trim() || null,
        from_details: fromDetails.trim() || null,
      },
      {
        onSuccess: () => toast.success(t("quotes.toasts.saved")),
        onError: (mutationError) => toast.error(mutationError.message),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#30aece]">{t("quotes.title")}</CardTitle>
        <CardDescription>{t("quotes.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor="quote-valid-days">{t("quotes.validDays")}</FieldLabel>
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
              {t("quotes.validDaysHint")}
            </FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="quote-default-terms">{t("quotes.terms")}</FieldLabel>
          <Textarea
            id="quote-default-terms"
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
            rows={3}
            maxLength={5000}
            placeholder={t("quotes.termsPlaceholder")}
          />
          <FieldDescription>{t("quotes.termsHint")}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="quote-from-details">{t("quotes.fromDetails")}</FieldLabel>
          <Textarea
            id="quote-from-details"
            value={fromDetails}
            onChange={(event) => setFromDetails(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder={t("quotes.fromDetailsPlaceholder")}
          />
        </Field>
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" onClick={save} disabled={!dirty || updateSettings.isPending}>
          {updateSettings.isPending ? tc("actions.saving") : t("quotes.save")}
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
  const t = useTranslations("businessProfile.moduleSettings");
  const tc = useTranslations("common");
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
      setError(t("invoices.errors.netDays"));
      return;
    }

    updateSettings.mutate(
      {
        net_days: days,
        payment_instructions: paymentInstructions.trim() || null,
        from_details: fromDetails.trim() || null,
      },
      {
        onSuccess: () => toast.success(t("invoices.toasts.saved")),
        onError: (mutationError) => toast.error(mutationError.message),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#30aece]">{t("invoices.title")}</CardTitle>
        <CardDescription>{t("invoices.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field data-invalid={!!error || undefined}>
          <FieldLabel htmlFor="invoice-net-days">{t("invoices.netDays")}</FieldLabel>
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
              {t("invoices.netDaysHint")}
            </FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="invoice-payment-instructions">
            {t("invoices.paymentInstructions")}
          </FieldLabel>
          <Textarea
            id="invoice-payment-instructions"
            value={paymentInstructions}
            onChange={(event) => setPaymentInstructions(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t("invoices.paymentInstructionsPlaceholder")}
          />
          <FieldDescription>{t("invoices.paymentInstructionsHint")}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="invoice-from-details">{t("invoices.fromDetails")}</FieldLabel>
          <Textarea
            id="invoice-from-details"
            value={fromDetails}
            onChange={(event) => setFromDetails(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder={t("invoices.fromDetailsPlaceholder")}
          />
        </Field>
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" onClick={save} disabled={!dirty || updateSettings.isPending}>
          {updateSettings.isPending ? tc("actions.saving") : t("invoices.save")}
        </Button>
      </CardFooter>
    </Card>
  );
}
