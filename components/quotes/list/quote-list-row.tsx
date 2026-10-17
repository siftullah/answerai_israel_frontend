"use client";

import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { formatDate, formatDateKey } from "@/lib/datetime";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Quote } from "@/lib/api/types";

/** The row's third line: where this quote is in its life, date-first. */
function dateLine(quote: Quote, timeZone: string): { text: string; warn: boolean } {
  switch (quote.status) {
    case "draft":
      return {
        text:
          quote.source === "agent_call"
            ? "Quote request from a call — price it up"
            : "Draft — not sent yet",
        warn: false,
      };
    case "sent":
      return {
        text: quote.valid_until ? `Valid until ${formatDateKey(quote.valid_until)}` : "Sent",
        warn: false,
      };
    case "accepted":
      return {
        text: quote.accepted_at ? `Accepted ${formatDate(quote.accepted_at, timeZone)}` : "Accepted",
        warn: false,
      };
    case "declined":
      return {
        text: quote.declined_at ? `Declined ${formatDate(quote.declined_at, timeZone)}` : "Declined",
        warn: false,
      };
    case "expired":
      return {
        text: quote.valid_until ? `Expired ${formatDateKey(quote.valid_until)}` : "Expired",
        warn: true,
      };
    case "void":
      return {
        text: quote.voided_at ? `Voided ${formatDate(quote.voided_at, timeZone)}` : "Void",
        warn: false,
      };
  }
}

export function QuoteListRow({
  quote,
  selected,
  timeZone,
  onSelect,
}: {
  quote: Quote;
  selected: boolean;
  timeZone: string;
  onSelect: () => void;
}) {
  const line = dateLine(quote, timeZone);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      className={cn(
        "flex w-full flex-col gap-1 border-b border-border px-3 py-3 text-left outline-none transition-colors focus-visible:bg-muted",
        selected
          ? "bg-primary/[0.07]"
          : quote.status === "expired"
            ? "bg-warning/[0.04] hover:bg-warning/[0.08]"
            : "hover:bg-muted/60"
      )}
    >
      {/* Number (+ title) + total */}
      <div className="flex w-full items-baseline gap-2">
        <span
          className={cn(
            "shrink-0 text-[15px] font-semibold tracking-wide",
            selected ? "text-primary" : "text-foreground"
          )}
        >
          {quote.number}
        </span>
        {quote.title && (
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
            {quote.title}
          </span>
        )}
        <span
          className={cn(
            "shrink-0 text-[15px] font-semibold whitespace-nowrap tabular-nums",
            !quote.title && "ml-auto"
          )}
        >
          {formatCents(quote.total_cents, quote.currency)}
        </span>
      </div>

      {/* Contact + status */}
      <div className="flex w-full items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/75">
          {quote.contact?.name ?? "—"}
        </span>
        <QuoteStatusBadge status={quote.status} />
      </div>

      {/* Lifecycle date */}
      <span
        className={cn("text-xs", line.warn ? "font-medium text-warning" : "text-muted-foreground")}
      >
        {line.text}
      </span>
    </button>
  );
}
