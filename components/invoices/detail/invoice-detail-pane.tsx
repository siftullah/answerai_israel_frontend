"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeftIcon,
  BanIcon,
  CheckIcon,
  CopyIcon,
  PencilIcon,
  ReceiptTextIcon,
  SendIcon,
  Trash2Icon,
  UserRoundIcon,
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
import { useBusiness } from "@/components/business/business-provider";
import { DetailCard } from "@/components/calls/detail/detail-card";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { DeleteInvoiceDialog } from "@/components/invoices/delete-invoice-dialog";
import { InvoiceFormDialog } from "@/components/invoices/invoice-form-dialog";
import { MarkInvoicePaidDialog } from "@/components/invoices/mark-invoice-paid-dialog";
import { SendInvoiceDialog } from "@/components/invoices/send-invoice-dialog";
import { VoidInvoiceDialog } from "@/components/invoices/void-invoice-dialog";
import { useDuplicateInvoice, useInvoiceDetail } from "@/hooks/use-invoices";
import { useTaxDefaults } from "@/hooks/use-tax-defaults";
import { formatDate, formatDateKey, formatDateTime } from "@/lib/datetime";
import { formatCents } from "@/lib/money";
import type { Invoice } from "@/lib/api/types";
import { LINE_ITEM_KIND_LABELS } from "@/lib/api/types";

function BackButton({ onBack }: { onBack: () => void }) {
  const t = useTranslations("invoices.detail");
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
  invoice,
  timeZone,
}: {
  businessUuid: string;
  invoice: Invoice;
  timeZone: string;
}) {
  const t = useTranslations("invoices");
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-3">
      <Meta label={t("labels.customer")}>
        {invoice.contact ? (
          <Link
            href={`/b/${businessUuid}/contacts/${invoice.contact.id}`}
            className="text-primary hover:underline"
          >
            {invoice.contact.name}
          </Link>
        ) : (
          "—"
        )}
      </Meta>
      {invoice.job && (
        <Meta label={t("detail.fields.fromJob")}>
          <Link
            href={`/b/${businessUuid}/jobs?job=${invoice.job.id}`}
            className="text-primary hover:underline"
          >
            {invoice.job.reference}
          </Link>
        </Meta>
      )}
      <Meta label={t("detail.fields.issued")}>
        {invoice.issue_date ? formatDateKey(invoice.issue_date) : t("labels.setOnSend")}
      </Meta>
      <Meta label={t("detail.fields.due")}>
        {invoice.due_date ? (
          <span className={invoice.status === "overdue" ? "text-destructive" : undefined}>
            {formatDateKey(invoice.due_date)}
          </span>
        ) : (
          t("labels.setOnSend")
        )}
      </Meta>
      {invoice.sent_at && (
        <Meta label={t("detail.fields.sent")}>{formatDateTime(invoice.sent_at, timeZone)}</Meta>
      )}
      {invoice.paid_at && (
        <Meta label={t("detail.fields.paid")}>
          {formatDateTime(invoice.paid_at, timeZone)}
          {invoice.payment_reference && (
            <span className="block text-xs font-normal text-muted-foreground">
              {invoice.payment_reference}
            </span>
          )}
        </Meta>
      )}
      {invoice.voided_at && (
        <Meta label={t("detail.fields.voided")}>
          {formatDateTime(invoice.voided_at, timeZone)}
        </Meta>
      )}
      <Meta label={t("detail.fields.created")}>{formatDate(invoice.created_at, timeZone)}</Meta>
    </dl>
  );
}

/** "5.00" → "5", "1.50" → "1.5". */
function displayQuantity(quantity: string): string {
  const parsed = Number(quantity);
  return Number.isFinite(parsed) ? String(parsed) : quantity;
}

function ItemsCard({ invoice, taxLabel }: { invoice: Invoice; taxLabel: string }) {
  const t = useTranslations("invoices.labels");
  const tc = useTranslations("common");
  const items = invoice.items ?? [];
  const currency = invoice.currency;

  return (
    <DetailCard title={t("lineItems")} accent>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tc("labels.description")}</TableHead>
              <TableHead className="text-end">{t("qty")}</TableHead>
              <TableHead className="text-end">{t("unit")}</TableHead>
              <TableHead className="text-end">{taxLabel}</TableHead>
              <TableHead className="text-end">{t("amount")}</TableHead>
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
            <dd className="tabular-nums">{formatCents(invoice.subtotal_cents, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{taxLabel}</dt>
            <dd className="tabular-nums">{formatCents(invoice.tax_cents, currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
            <dt>{tc("labels.total")}</dt>
            <dd className="tabular-nums">{formatCents(invoice.total_cents, currency)}</dd>
          </div>
        </dl>
      </div>
    </DetailCard>
  );
}

export function InvoiceDetailPane({
  businessUuid,
  invoiceUuid,
  onBack,
  onClearSelection,
}: {
  businessUuid: string;
  invoiceUuid: string | null;
  onBack: () => void;
  onClearSelection: () => void;
}) {
  const t = useTranslations("invoices");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const invoiceQuery = useInvoiceDetail(businessUuid, invoiceUuid);
  const { taxLabel } = useTaxDefaults(businessUuid);
  const duplicateInvoice = useDuplicateInvoice(businessUuid);

  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (invoiceUuid === null) {
    return (
      <Empty className="hidden flex-1 lg:flex">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ReceiptTextIcon />
          </EmptyMedia>
          <EmptyTitle>{t("detail.noneSelected.title")}</EmptyTitle>
          <EmptyDescription>{t("detail.noneSelected.description")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (invoiceQuery.isPending) {
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

  if (invoiceQuery.isError) {
    const notFound = invoiceQuery.error.status === 404;
    return (
      <div className="flex flex-1 flex-col items-start gap-4">
        <BackButton onBack={onBack} />
        <ErrorState
          title={notFound ? t("detail.notFound.title") : t("detail.loadError")}
          message={
            notFound ? t("detail.notFound.description") : invoiceQuery.error.message
          }
          onRetry={notFound ? onClearSelection : () => invoiceQuery.refetch()}
        />
      </div>
    );
  }

  const invoice = invoiceQuery.data;
  const draft = invoice.status === "draft";
  const awaitingPayment = invoice.status === "sent" || invoice.status === "overdue";

  const duplicate = () =>
    duplicateInvoice.mutate(invoice.id, {
      onSuccess: (copy) => toast.success(t("toasts.draftCreated", { number: copy.number })),
      onError: (error) => toast.error(error.message),
    });

  return (
    <div key={invoice.id} className="flex flex-1 flex-col lg:min-h-0">
      <BackButton onBack={onBack} />

      <div className="scrollbar-slim flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pe-4">
        <div className="flex flex-col divide-y divide-border">
          <div className="flex flex-col gap-4 pb-6">
            {/* Identity + status */}
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="max-w-full truncate font-heading text-2xl font-semibold">
                    {t("detail.title", { number: invoice.number })}
                  </h2>
                  <InvoiceStatusBadge status={invoice.status} />
                  {invoice.job && (
                    <Badge variant="outline">
                      {t("detail.fromJobBadge", { reference: invoice.job.reference })}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatCents(invoice.total_cents, invoice.currency)}
                  {invoice.currency !== "ILS" && ` ${invoice.currency}`}
                </p>
              </div>
              {invoice.contact && (
                <Button
                  variant="cta"
                  size="sm"
                  render={<Link href={`/b/${businessUuid}/contacts/${invoice.contact.id}`} />}
                >
                  <UserRoundIcon />
                  {t("actions.viewContact")}
                </Button>
              )}
            </div>

            <MetaBand
              businessUuid={businessUuid}
              invoice={invoice}
              timeZone={business.timezone}
            />

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
              {awaitingPayment && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="border border-success/25 bg-success/10 text-success hover:bg-success/15 hover:text-success"
                  onClick={() => setMarkingPaid(true)}
                >
                  <CheckIcon />
                  {t("actions.markPaid")}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={duplicateInvoice.isPending}
                onClick={duplicate}
              >
                <CopyIcon />
                {t("actions.duplicate")}
              </Button>
              {awaitingPayment && (
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

          <ItemsCard invoice={invoice} taxLabel={taxLabel} />

          {invoice.notes && (
            <DetailCard title={tc("labels.notes")}>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{invoice.notes}</p>
            </DetailCard>
          )}

          {invoice.payment_instructions && (
            <DetailCard title={t("labels.paymentInstructions")}>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {invoice.payment_instructions}
              </p>
            </DetailCard>
          )}
        </div>
      </div>

      {editing && (
        <InvoiceFormDialog
          open
          invoice={invoice}
          onOpenChange={(next) => {
            if (!next) setEditing(false);
          }}
        />
      )}
      {sending && (
        <SendInvoiceDialog
          open
          businessUuid={businessUuid}
          invoice={invoice}
          onOpenChange={(next) => {
            if (!next) setSending(false);
          }}
        />
      )}
      {markingPaid && (
        <MarkInvoicePaidDialog
          open
          businessUuid={businessUuid}
          invoice={invoice}
          onOpenChange={(next) => {
            if (!next) setMarkingPaid(false);
          }}
        />
      )}
      {voiding && (
        <VoidInvoiceDialog
          businessUuid={businessUuid}
          invoice={invoice}
          onOpenChange={(next) => {
            if (!next) setVoiding(false);
          }}
        />
      )}
      {deleting && (
        <DeleteInvoiceDialog
          businessUuid={businessUuid}
          invoice={invoice}
          onOpenChange={(next) => {
            if (!next) setDeleting(false);
          }}
          onDeleted={onClearSelection}
        />
      )}
    </div>
  );
}
