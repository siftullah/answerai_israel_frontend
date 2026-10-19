"use client";

import { useTranslations } from "next-intl";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { formatDate, formatDateKey } from "@/lib/datetime";
import type { Translator } from "@/lib/i18n/types";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/lib/api/types";
import { INVOICE_STATUS_LABELS } from "@/lib/api/types";

/** The row's third line: where this invoice is in its life, date-first. */
function dateLine(
  invoice: Invoice,
  timeZone: string,
  t: Translator
): { text: string; overdue: boolean } {
  switch (invoice.status) {
    case "draft":
      return { text: t("draft"), overdue: false };
    case "sent":
      return {
        text: invoice.due_date
          ? t("due", { date: formatDateKey(invoice.due_date) })
          : INVOICE_STATUS_LABELS.sent,
        overdue: false,
      };
    case "overdue":
      return {
        text: invoice.due_date
          ? t("wasDue", { date: formatDateKey(invoice.due_date) })
          : INVOICE_STATUS_LABELS.overdue,
        overdue: true,
      };
    case "paid":
      return {
        text: invoice.paid_at
          ? t("paid", { date: formatDate(invoice.paid_at, timeZone) })
          : INVOICE_STATUS_LABELS.paid,
        overdue: false,
      };
    case "void":
      return {
        text: invoice.voided_at
          ? t("voided", { date: formatDate(invoice.voided_at, timeZone) })
          : INVOICE_STATUS_LABELS.void,
        overdue: false,
      };
  }
}

export function InvoiceListRow({
  invoice,
  selected,
  timeZone,
  onSelect,
}: {
  invoice: Invoice;
  selected: boolean;
  timeZone: string;
  onSelect: () => void;
}) {
  const t = useTranslations("invoices.row");
  const line = dateLine(invoice, timeZone, t);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      className={cn(
        "flex w-full flex-col gap-1 border-b border-border px-3 py-3 text-start outline-none transition-colors focus-visible:bg-muted",
        selected
          ? "bg-primary/[0.07]"
          : invoice.status === "overdue"
            ? "bg-destructive/[0.04] hover:bg-destructive/[0.08]"
            : "hover:bg-muted/60"
      )}
    >
      {/* Number + total */}
      <div className="flex w-full items-baseline gap-2">
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[15px] font-semibold tracking-wide",
            selected ? "text-primary" : "text-foreground"
          )}
        >
          {invoice.number}
        </span>
        <span className="shrink-0 text-[15px] font-semibold whitespace-nowrap tabular-nums">
          {formatCents(invoice.total_cents, invoice.currency)}
        </span>
      </div>

      {/* Contact + status */}
      <div className="flex w-full items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/75">
          {invoice.contact?.name ?? "—"}
        </span>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      {/* Lifecycle date */}
      <span
        className={cn(
          "text-xs",
          line.overdue ? "font-medium text-destructive" : "text-muted-foreground"
        )}
      >
        {line.text}
      </span>
    </button>
  );
}
