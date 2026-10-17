"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckIcon, PrinterIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useAcceptPublicQuote,
  useDeclinePublicQuote,
  usePublicQuote,
} from "@/hooks/use-public-quote";
import { formatDateKey, formatDateTime } from "@/lib/datetime";
import { formatCents } from "@/lib/money";
import { formatE164 } from "@/lib/phone";
import type { PublicQuote } from "@/lib/api/types";

/** "5.00" → "5", "1.50" → "1.5". */
function displayQuantity(quantity: string): string {
  const parsed = Number(quantity);
  return Number.isFinite(parsed) ? String(parsed) : quantity;
}

function StatusBanner({ quote }: { quote: PublicQuote }) {
  const timeZone = quote.business.timezone;

  if (quote.status === "accepted") {
    return (
      <Alert variant="success" className="print:hidden">
        <CheckIcon />
        <AlertTitle>Quote accepted</AlertTitle>
        <AlertDescription>
          {quote.accepted_at
            ? `Accepted on ${formatDateTime(quote.accepted_at, timeZone)}. ${quote.business.name} will be in touch to get things moving.`
            : `${quote.business.name} will be in touch to get things moving.`}
        </AlertDescription>
      </Alert>
    );
  }

  if (quote.status === "declined") {
    return (
      <Alert className="print:hidden">
        <XIcon />
        <AlertTitle>Quote declined</AlertTitle>
        <AlertDescription>
          You declined this quote. Changed your mind? Contact {quote.business.name} for a fresh
          one.
        </AlertDescription>
      </Alert>
    );
  }

  if (quote.status === "expired") {
    return (
      <Alert variant="warning" className="print:hidden">
        <AlertTitle>This quote has expired</AlertTitle>
        <AlertDescription>
          {quote.valid_until
            ? `It was valid until ${formatDateKey(quote.valid_until)}. `
            : ""}
          Contact {quote.business.name} and they can re-issue it.
        </AlertDescription>
      </Alert>
    );
  }

  if (quote.status === "void") {
    return (
      <Alert className="print:hidden">
        <AlertTitle>This quote has been withdrawn</AlertTitle>
        <AlertDescription>
          Contact {quote.business.name} if you were expecting to accept it.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

function AcceptDialog({
  quote,
  token,
  onOpenChange,
}: {
  quote: PublicQuote;
  token: string;
  onOpenChange: (open: boolean) => void;
}) {
  const accept = useAcceptPublicQuote(token);

  const confirm = () => {
    accept.mutate(undefined, {
      onSuccess: () => toast.success("Quote accepted — thank you!"),
      onError: (error) => toast.error(error.message),
      onSettled: () => onOpenChange(false),
    });
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Accept this quote?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;re accepting quote {quote.number} from {quote.business.name} for{" "}
            {formatCents(quote.total_cents, quote.currency)}
            {quote.deposit_cents > 0
              ? `, with ${formatCents(quote.deposit_cents, quote.currency)} payable to commence`
              : ""}
            . {quote.business.name} will be notified right away.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not yet</AlertDialogCancel>
          <AlertDialogAction disabled={accept.isPending} onClick={confirm}>
            {accept.isPending ? "Accepting…" : "Accept quote"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeclineDialog({
  quote,
  token,
  onOpenChange,
}: {
  quote: PublicQuote;
  token: string;
  onOpenChange: (open: boolean) => void;
}) {
  const decline = useDeclinePublicQuote(token);
  const [reason, setReason] = useState("");

  const submit = () => {
    const trimmed = reason.trim();
    decline.mutate(
      { ...(trimmed !== "" ? { reason: trimmed } : {}) },
      {
        onSuccess: () => toast.success("No worries — the quote has been declined."),
        onError: (error) => toast.error(error.message),
        onSettled: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Decline this quote</DialogTitle>
          <DialogDescription>
            Lets {quote.business.name} know you won&apos;t be going ahead with quote{" "}
            {quote.number}.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="public-decline-reason">Reason</FieldLabel>
          <Textarea
            id="public-decline-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Optional — helps them quote you better next time"
          />
          <FieldDescription>Optional.</FieldDescription>
        </Field>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={decline.isPending}
          >
            {decline.isPending ? "Declining…" : "Decline quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LoadingDocument() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

function DeadLink() {
  return (
    <div className="flex flex-col items-center gap-2 py-24 text-center">
      <h1 className="font-heading text-2xl font-semibold">This quote link isn&apos;t valid</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The link may have been mistyped, or the quote is no longer available. Check the link in
        your email, or contact the business that sent it.
      </p>
    </div>
  );
}

export function PublicQuoteView() {
  const { token } = useParams<{ token: string }>();
  const quoteQuery = usePublicQuote(token);

  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  return (
    <div className="min-h-screen bg-muted/40 print:bg-transparent">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8 sm:py-12 print:max-w-none print:p-0">
        {quoteQuery.isPending && <LoadingDocument />}

        {quoteQuery.isError && <DeadLink />}

        {quoteQuery.isSuccess && (
          <QuoteDocument
            quote={quoteQuery.data}
            onAccept={() => setAccepting(true)}
            onDecline={() => setDeclining(true)}
          />
        )}

        {accepting && quoteQuery.data && (
          <AcceptDialog
            quote={quoteQuery.data}
            token={token}
            onOpenChange={(next) => {
              if (!next) setAccepting(false);
            }}
          />
        )}
        {declining && quoteQuery.data && (
          <DeclineDialog
            quote={quoteQuery.data}
            token={token}
            onOpenChange={(next) => {
              if (!next) setDeclining(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function QuoteDocument({
  quote,
  onAccept,
  onDecline,
}: {
  quote: PublicQuote;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const currency = quote.currency;
  const live = quote.status === "sent";

  return (
    <>
      <StatusBanner quote={quote} />

      <div className="flex flex-col gap-8 rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-10 print:border-0 print:p-0 print:shadow-none">
        {/* Letterhead */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {quote.business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- external host (backend media), unoptimized on purpose
              <img
                src={quote.business.logo_url}
                alt={`${quote.business.name} logo`}
                className="size-12 rounded-lg object-contain"
              />
            ) : null}
            <div className="flex flex-col">
              <span className="font-heading text-lg font-semibold">{quote.business.name}</span>
              {(quote.business.public_email || quote.business.public_phone) && (
                <span className="text-xs text-muted-foreground">
                  {[
                    quote.business.public_email,
                    quote.business.public_phone
                      ? formatE164(quote.business.public_phone)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs tracking-widest text-muted-foreground uppercase">Quote</span>
            <span className="font-heading text-xl font-semibold tracking-wide">
              {quote.number}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-4">
          {quote.title && (
            <h1 className="font-heading text-2xl font-semibold">{quote.title}</h1>
          )}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-3 print:bg-transparent print:p-0">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Prepared for</dt>
              <dd className="text-sm font-medium">{quote.contact.name}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Issued</dt>
              <dd className="text-sm font-medium">
                {quote.issue_date ? formatDateKey(quote.issue_date) : "—"}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Valid until</dt>
              <dd className="text-sm font-medium">
                {quote.valid_until ? formatDateKey(quote.valid_until) : "—"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Line items */}
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-72 whitespace-normal">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {displayQuantity(item.quantity)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(item.unit_price_cents, currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCents(item.amount_cents, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <dl className="flex w-64 flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatCents(quote.subtotal_cents, currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{quote.tax_label}</dt>
                <dd className="tabular-nums">{formatCents(quote.tax_cents, currency)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatCents(quote.total_cents, currency)}</dd>
              </div>
              {quote.deposit_cents > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <dt>
                    Deposit to commence
                    {quote.deposit_type === "percent" ? ` (${quote.deposit_value}%)` : ""}
                  </dt>
                  <dd className="tabular-nums">
                    {formatCents(quote.deposit_cents, currency)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {quote.notes && (
          <div className="flex flex-col gap-1.5">
            <h2 className="text-sm font-semibold">Notes</h2>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{quote.notes}</p>
          </div>
        )}

        {quote.terms && (
          <div className="flex flex-col gap-1.5">
            <h2 className="text-sm font-semibold">Terms</h2>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{quote.terms}</p>
          </div>
        )}

        {quote.business.from_details && (
          <p className="border-t border-border pt-4 text-xs whitespace-pre-wrap text-muted-foreground">
            {quote.business.from_details}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => window.print()}>
          <PrinterIcon />
          Print or save PDF
        </Button>
        {live && (
          <>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={onDecline}
            >
              <XIcon />
              Decline
            </Button>
            <Button size="lg" onClick={onAccept}>
              <CheckIcon />
              Accept quote
            </Button>
          </>
        )}
      </div>
    </>
  );
}
