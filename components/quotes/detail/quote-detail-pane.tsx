"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeftIcon,
  BanIcon,
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  LinkIcon,
  PencilIcon,
  ReceiptTextIcon,
  SendIcon,
  Trash2Icon,
  UserRoundIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorState } from "@/components/error-state";
import { useBusiness, useModuleEnabled } from "@/components/business/business-provider";
import { DetailCard } from "@/components/calls/detail/detail-card";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { AcceptQuoteDialog } from "@/components/quotes/accept-quote-dialog";
import { ConvertQuoteDialog } from "@/components/quotes/convert-quote-dialog";
import { ConvertQuoteToJobDialog } from "@/components/quotes/convert-quote-to-job-dialog";
import { DeclineQuoteDialog } from "@/components/quotes/decline-quote-dialog";
import { DeleteQuoteDialog } from "@/components/quotes/delete-quote-dialog";
import { QuoteFormDialog } from "@/components/quotes/quote-form-dialog";
import { ResendQuoteDialog } from "@/components/quotes/resend-quote-dialog";
import { SendQuoteDialog } from "@/components/quotes/send-quote-dialog";
import { VoidQuoteDialog } from "@/components/quotes/void-quote-dialog";
import { useDuplicateQuote, useQuoteDetail } from "@/hooks/use-quotes";
import { useTaxDefaults } from "@/hooks/use-tax-defaults";
import { formatDate, formatDateKey, formatDateTime } from "@/lib/datetime";
import type { Translator } from "@/lib/i18n/types";
import { formatCents } from "@/lib/money";
import type { Quote } from "@/lib/api/types";
import { LINE_ITEM_KIND_LABELS } from "@/lib/api/types";

function BackButton({ onBack }: { onBack: () => void }) {
  const t = useTranslations("quotes.detail");
  return (
    <Button variant="ghost" size="sm" className="mb-3 self-start lg:hidden" onClick={onBack}>
      <ArrowLeftIcon className="rtl:-scale-x-100" />
      {t("back")}
    </Button>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

function MetaBand({
  businessUuid,
  quote,
  timeZone,
}: {
  businessUuid: string;
  quote: Quote;
  timeZone: string;
}) {
  const t = useTranslations("quotes");
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-3">
      <Meta label={t("labels.customer")}>
        {quote.contact ? (
          <Link
            href={`/b/${businessUuid}/contacts/${quote.contact.id}`}
            className="text-primary hover:underline"
          >
            {quote.contact.name}
          </Link>
        ) : (
          "—"
        )}
      </Meta>
      {quote.lead && (
        <Meta label={t("detail.fields.fromLead")}>
          <Link
            href={`/b/${businessUuid}/leads?lead=${quote.lead.id}`}
            className="text-primary hover:underline"
          >
            {quote.lead.title}
          </Link>
        </Meta>
      )}
      <Meta label={t("detail.fields.issued")}>
        {quote.issue_date ? formatDateKey(quote.issue_date) : t("labels.setOnSend")}
      </Meta>
      <Meta label={t("labels.validUntil")}>
        {quote.valid_until ? (
          <span className={quote.status === "expired" ? "text-warning" : undefined}>
            {formatDateKey(quote.valid_until)}
          </span>
        ) : (
          t("labels.setOnSend")
        )}
      </Meta>
      {quote.sent_at && (
        <Meta label={t("detail.fields.sent")}>{formatDateTime(quote.sent_at, timeZone)}</Meta>
      )}
      {quote.viewed_at && (
        <Meta label={t("detail.fields.viewed")}>
          {formatDateTime(quote.viewed_at, timeZone)}
        </Meta>
      )}
      {quote.accepted_at && (
        <Meta label={t("detail.fields.accepted")}>
          {formatDateTime(quote.accepted_at, timeZone)}
          <span className="block text-xs font-normal text-muted-foreground">
            {quote.accepted_via === "public_link"
              ? t("detail.fields.acceptedOnline")
              : t("detail.fields.acceptedInPortal")}
          </span>
        </Meta>
      )}
      {quote.declined_at && (
        <Meta label={t("detail.fields.declined")}>
          {formatDateTime(quote.declined_at, timeZone)}
          {quote.decline_reason && (
            <span className="block text-xs font-normal text-muted-foreground">
              {quote.decline_reason}
            </span>
          )}
        </Meta>
      )}
      {quote.voided_at && (
        <Meta label={t("detail.fields.voided")}>{formatDateTime(quote.voided_at, timeZone)}</Meta>
      )}
      <Meta label={t("detail.fields.created")}>{formatDate(quote.created_at, timeZone)}</Meta>
    </dl>
  );
}

/** "5.00" → "5", "1.50" → "1.5". */
function displayQuantity(quantity: string): string {
  const parsed = Number(quantity);
  return Number.isFinite(parsed) ? String(parsed) : quantity;
}

function depositLabel(quote: Quote, t: Translator): string {
  if (quote.deposit_type === "percent") {
    return t("detail.depositPercent", { percent: quote.deposit_value ?? 0 });
  }
  return t("labels.deposit");
}

function ItemsCard({ quote, taxLabel }: { quote: Quote; taxLabel: string }) {
  const t = useTranslations("quotes");
  const tc = useTranslations("common");
  const items = quote.items ?? [];
  const currency = quote.currency;

  if (items.length === 0) {
    return (
      <DetailCard title={t("labels.lineItems")} accent>
        <p className="text-sm text-muted-foreground">
          {quote.source === "agent_call" ? t("detail.noItemsFromCall") : t("detail.noItems")}
        </p>
      </DetailCard>
    );
  }

  return (
    <DetailCard title={t("labels.lineItems")} accent>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tc("labels.description")}</TableHead>
              <TableHead className="text-end">{t("labels.qty")}</TableHead>
              <TableHead className="text-end">{t("labels.unit")}</TableHead>
              <TableHead className="text-end">{taxLabel}</TableHead>
              <TableHead className="text-end">{t("labels.amount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-64 whitespace-normal">
                  {item.description}
                  <span className="block text-xs text-muted-foreground">
                    {LINE_ITEM_KIND_LABELS[item.kind]}
                  </span>
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {displayQuantity(item.quantity)}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {formatCents(item.unit_price_cents, currency)}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {item.tax_rate_bp > 0 ? `${item.tax_rate_bp / 100}%` : "—"}
                </TableCell>
                <TableCell className="text-end font-medium tabular-nums">
                  {formatCents(item.amount_cents, currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <dl className="flex w-56 flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{tc("labels.subtotal")}</dt>
            <dd className="tabular-nums">{formatCents(quote.subtotal_cents, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{taxLabel}</dt>
            <dd className="tabular-nums">{formatCents(quote.tax_cents, currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
            <dt>{tc("labels.total")}</dt>
            <dd className="tabular-nums">{formatCents(quote.total_cents, currency)}</dd>
          </div>
          {quote.deposit_cents > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <dt>{depositLabel(quote, t)}</dt>
              <dd className="tabular-nums">{formatCents(quote.deposit_cents, currency)}</dd>
            </div>
          )}
        </dl>
      </div>
    </DetailCard>
  );
}

export function QuoteDetailPane({
  businessUuid,
  quoteUuid,
  onBack,
  onClearSelection,
}: {
  businessUuid: string;
  quoteUuid: string | null;
  onBack: () => void;
  onClearSelection: () => void;
}) {
  const t = useTranslations("quotes");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const quoteQuery = useQuoteDetail(businessUuid, quoteUuid);
  const { taxLabel } = useTaxDefaults(businessUuid);
  const duplicateQuote = useDuplicateQuote(businessUuid);
  const jobsEnabled = useModuleEnabled("jobs");

  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertingToJob, setConvertingToJob] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (quoteUuid === null) {
    return (
      <Empty className="hidden flex-1 lg:flex">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileTextIcon />
          </EmptyMedia>
          <EmptyTitle>{t("detail.noneSelected.title")}</EmptyTitle>
          <EmptyDescription>{t("detail.noneSelected.description")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (quoteQuery.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <BackButton onBack={onBack} />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (quoteQuery.isError) {
    const notFound = quoteQuery.error.status === 404;
    return (
      <div className="flex flex-1 flex-col items-start gap-4">
        <BackButton onBack={onBack} />
        <ErrorState
          title={notFound ? t("detail.notFound.title") : t("detail.loadError")}
          message={notFound ? t("detail.notFound.description") : quoteQuery.error.message}
          onRetry={notFound ? onClearSelection : () => quoteQuery.refetch()}
        />
      </div>
    );
  }

  const quote = quoteQuery.data;
  const draft = quote.status === "draft";
  const sent = quote.status === "sent";
  const expired = quote.status === "expired";
  const accepted = quote.status === "accepted";
  const awaiting = sent || expired;
  const liveInvoice = (quote.invoices ?? []).find((invoice) => invoice.status !== "void");
  const job = (quote.jobs ?? [])[0];

  const duplicate = () =>
    duplicateQuote.mutate(quote.id, {
      onSuccess: (copy) => toast.success(t("toasts.draftCreated", { number: copy.number })),
      onError: (error) => toast.error(error.message),
    });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(quote.public_url);
      toast.success(t("toasts.linkCopied"));
    } catch {
      toast.error(t("toasts.copyFailed", { url: quote.public_url }));
    }
  };

  return (
    <div key={quote.id} className="flex flex-1 flex-col lg:min-h-0">
      <BackButton onBack={onBack} />

      <div className="scrollbar-slim flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pe-4">
        <div className="flex flex-col divide-y divide-border">
          <div className="flex flex-col gap-4 pb-6">
            {/* Identity + status */}
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="max-w-full truncate font-heading text-2xl font-semibold">
                    {t("detail.title", { number: quote.number })}
                  </h2>
                  <QuoteStatusBadge status={quote.status} />
                  {quote.source === "agent_call" && (
                    <Badge variant="outline">{t("detail.fromCallBadge")}</Badge>
                  )}
                  {liveInvoice && (
                    <Badge variant="outline">
                      {t("detail.invoicedAsBadge", { number: liveInvoice.number })}
                    </Badge>
                  )}
                  {job && (
                    <Badge variant="outline">
                      {t("detail.jobBadge", { reference: job.reference })}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {quote.title ? `${quote.title} · ` : ""}
                  {formatCents(quote.total_cents, quote.currency)}
                  {quote.currency !== "ILS" && ` ${quote.currency}`}
                </p>
              </div>
              {quote.contact && (
                <Button
                  variant="cta"
                  size="sm"
                  render={<Link href={`/b/${businessUuid}/contacts/${quote.contact.id}`} />}
                >
                  <UserRoundIcon />
                  {t("actions.viewContact")}
                </Button>
              )}
            </div>

            <MetaBand businessUuid={businessUuid} quote={quote} timeZone={business.timezone} />

            <div className="flex flex-wrap gap-2">
              {draft && (
                <>
                  <Button size="sm" onClick={() => setSending(true)}>
                    <SendIcon />
                    {t("actions.send")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    <PencilIcon />
                    {tc("actions.edit")}
                  </Button>
                </>
              )}
              {expired && (
                <Button size="sm" onClick={() => setResending(true)}>
                  <SendIcon />
                  {t("actions.revive")}
                </Button>
              )}
              {accepted && !liveInvoice && (
                <Button size="sm" onClick={() => setConverting(true)}>
                  <ReceiptTextIcon />
                  {t("actions.convertToInvoice")}
                </Button>
              )}
              {accepted && liveInvoice && (
                <Button
                  size="sm"
                  variant="cta"
                  render={
                    <Link href={`/b/${businessUuid}/invoices?invoice=${liveInvoice.id}`} />
                  }
                >
                  <ReceiptTextIcon />
                  {t("actions.viewInvoice")}
                </Button>
              )}
              {accepted && jobsEnabled && !job && (
                <Button size="sm" variant="outline" onClick={() => setConvertingToJob(true)}>
                  <WrenchIcon />
                  {t("actions.convertToJob")}
                </Button>
              )}
              {accepted && job && (
                <Button
                  size="sm"
                  variant="cta"
                  render={<Link href={`/b/${businessUuid}/jobs?job=${job.id}`} />}
                >
                  <WrenchIcon />
                  {t("actions.viewJob")}
                </Button>
              )}
              {sent && (
                <Button size="sm" variant="outline" onClick={copyLink}>
                  <LinkIcon />
                  {t("actions.copyLink")}
                </Button>
              )}
              {awaiting && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="border border-success/25 bg-success/10 text-success hover:bg-success/15 hover:text-success"
                  onClick={() => setAccepting(true)}
                >
                  <CheckIcon />
                  {t("actions.markAccepted")}
                </Button>
              )}
              {awaiting && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeclining(true)}
                >
                  <XIcon />
                  {t("actions.markDeclined")}
                </Button>
              )}
              {sent && (
                <Button size="sm" variant="outline" onClick={() => setResending(true)}>
                  <SendIcon />
                  {t("actions.resend")}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={duplicateQuote.isPending}
                onClick={duplicate}
              >
                <CopyIcon />
                {t("actions.duplicate")}
              </Button>
              {awaiting && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setVoiding(true)}
                >
                  <BanIcon />
                  {t("actions.void")}
                </Button>
              )}
              {draft && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(true)}
                >
                  <Trash2Icon />
                  {tc("actions.delete")}
                </Button>
              )}
            </div>
          </div>

          <ItemsCard quote={quote} taxLabel={taxLabel} />

          {quote.notes && (
            <DetailCard title={tc("labels.notes")}>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{quote.notes}</p>
            </DetailCard>
          )}

          {quote.terms && (
            <DetailCard title={t("labels.terms")}>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{quote.terms}</p>
            </DetailCard>
          )}

          {quote.internal_notes && (
            <DetailCard title={t("labels.internalNotes")}>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {quote.internal_notes}
              </p>
              <p className="text-xs text-muted-foreground/70">{t("detail.internalNotesHint")}</p>
            </DetailCard>
          )}
        </div>
      </div>

      {editing && (
        <QuoteFormDialog
          open
          quote={quote}
          onOpenChange={(next) => {
            if (!next) setEditing(false);
          }}
        />
      )}
      {sending && (
        <SendQuoteDialog
          open
          businessUuid={businessUuid}
          quote={quote}
          onOpenChange={(next) => {
            if (!next) setSending(false);
          }}
        />
      )}
      {resending && (
        <ResendQuoteDialog
          open
          businessUuid={businessUuid}
          quote={quote}
          onOpenChange={(next) => {
            if (!next) setResending(false);
          }}
        />
      )}
      {accepting && (
        <AcceptQuoteDialog
          businessUuid={businessUuid}
          quote={quote}
          onOpenChange={(next) => {
            if (!next) setAccepting(false);
          }}
        />
      )}
      {declining && (
        <DeclineQuoteDialog
          open
          businessUuid={businessUuid}
          quote={quote}
          onOpenChange={(next) => {
            if (!next) setDeclining(false);
          }}
        />
      )}
      {converting && (
        <ConvertQuoteDialog
          businessUuid={businessUuid}
          quote={quote}
          onOpenChange={(next) => {
            if (!next) setConverting(false);
          }}
        />
      )}
      {convertingToJob && (
        <ConvertQuoteToJobDialog
          businessUuid={businessUuid}
          quote={quote}
          onOpenChange={(next) => {
            if (!next) setConvertingToJob(false);
          }}
        />
      )}
      {voiding && (
        <VoidQuoteDialog
          businessUuid={businessUuid}
          quote={quote}
          onOpenChange={(next) => {
            if (!next) setVoiding(false);
          }}
        />
      )}
      {deleting && (
        <DeleteQuoteDialog
          businessUuid={businessUuid}
          quote={quote}
          onOpenChange={(next) => {
            if (!next) setDeleting(false);
          }}
          onDeleted={onClearSelection}
        />
      )}
    </div>
  );
}
