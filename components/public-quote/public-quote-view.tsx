"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { LanguagePicker } from "@/components/language-picker";
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
  const t = useTranslations("publicQuote");
  const timeZone = quote.business.timezone;
  const business = quote.business.name;

  if (quote.status === "accepted") {
    return (
      <Alert variant="success" className="print:hidden">
        <CheckIcon />
        <AlertTitle>{t("status.accepted.title")}</AlertTitle>
        <AlertDescription>
          {quote.accepted_at
            ? t("status.accepted.bodyWithDate", {
                date: formatDateTime(quote.accepted_at, timeZone),
                business,
              })
            : t("status.accepted.body", { business })}
        </AlertDescription>
      </Alert>
    );
  }

  if (quote.status === "declined") {
    return (
      <Alert className="print:hidden">
        <XIcon />
        <AlertTitle>{t("status.declined.title")}</AlertTitle>
        <AlertDescription>{t("status.declined.body", { business })}</AlertDescription>
      </Alert>
    );
  }

  if (quote.status === "expired") {
    return (
      <Alert variant="warning" className="print:hidden">
        <AlertTitle>{t("status.expired.title")}</AlertTitle>
        <AlertDescription>
          {quote.valid_until
            ? t("status.expired.bodyWithDate", {
                date: formatDateKey(quote.valid_until),
                business,
              })
            : t("status.expired.body", { business })}
        </AlertDescription>
      </Alert>
    );
  }

  if (quote.status === "void") {
    return (
      <Alert className="print:hidden">
        <AlertTitle>{t("status.void.title")}</AlertTitle>
        <AlertDescription>{t("status.void.body", { business })}</AlertDescription>
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
  const t = useTranslations("publicQuote");
  const accept = useAcceptPublicQuote(token);

  const confirm = () => {
    accept.mutate(undefined, {
      onSuccess: () => toast.success(t("accept.toasts.accepted")),
      onError: (error) => toast.error(error.message),
      onSettled: () => onOpenChange(false),
    });
  };

  const summary = {
    number: quote.number,
    business: quote.business.name,
    total: formatCents(quote.total_cents, quote.currency),
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("accept.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {quote.deposit_cents > 0
              ? t("accept.descriptionWithDeposit", {
                  ...summary,
                  deposit: formatCents(quote.deposit_cents, quote.currency),
                })
              : t("accept.description", summary)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("accept.notYet")}</AlertDialogCancel>
          <AlertDialogAction disabled={accept.isPending} onClick={confirm}>
            {accept.isPending ? t("accept.accepting") : t("accept.action")}
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
  const t = useTranslations("publicQuote");
  const tc = useTranslations("common");
  const decline = useDeclinePublicQuote(token);
  const [reason, setReason] = useState("");

  const submit = () => {
    const trimmed = reason.trim();
    decline.mutate(
      { ...(trimmed !== "" ? { reason: trimmed } : {}) },
      {
        onSuccess: () => toast.success(t("decline.toasts.declined")),
        onError: (error) => toast.error(error.message),
        onSettled: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("decline.title")}</DialogTitle>
          <DialogDescription>
            {t("decline.description", { business: quote.business.name, number: quote.number })}
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="public-decline-reason">{t("decline.reason")}</FieldLabel>
          <Textarea
            id="public-decline-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t("decline.reasonPlaceholder")}
          />
          <FieldDescription>{t("decline.reasonHint")}</FieldDescription>
        </Field>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc("actions.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={decline.isPending}
          >
            {decline.isPending ? t("decline.declining") : t("decline.action")}
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
  const t = useTranslations("publicQuote");
  return (
    <div className="flex flex-col items-center gap-2 py-24 text-center">
      <h1 className="font-heading text-2xl font-semibold">{t("deadLink.title")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{t("deadLink.body")}</p>
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
        {/* Customers land here without an account — the language choice lives on the page. */}
        <div className="flex items-center print:hidden">
          <LanguagePicker className="ms-auto" />
        </div>

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
  const t = useTranslations("publicQuote");
  const tc = useTranslations("common");
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
                alt={t("document.logoAlt", { business: quote.business.name })}
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
            <span className="text-xs tracking-widest text-muted-foreground uppercase">
              {t("document.quote")}
            </span>
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
              <dt className="text-xs text-muted-foreground">{t("document.preparedFor")}</dt>
              <dd className="text-sm font-medium">{quote.contact.name}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{t("document.issued")}</dt>
              <dd className="text-sm font-medium">
                {quote.issue_date ? formatDateKey(quote.issue_date) : "—"}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{t("document.validUntil")}</dt>
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
                  <TableHead>{tc("labels.description")}</TableHead>
                  <TableHead className="text-end">{t("document.qty")}</TableHead>
                  <TableHead className="text-end">{t("document.unit")}</TableHead>
                  <TableHead className="text-end">{t("document.amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-72 whitespace-normal">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {displayQuantity(item.quantity)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {formatCents(item.unit_price_cents, currency)}
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
            <dl className="flex w-64 flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{tc("labels.subtotal")}</dt>
                <dd className="tabular-nums">{formatCents(quote.subtotal_cents, currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{quote.tax_label}</dt>
                <dd className="tabular-nums">{formatCents(quote.tax_cents, currency)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
                <dt>{tc("labels.total")}</dt>
                <dd className="tabular-nums">{formatCents(quote.total_cents, currency)}</dd>
              </div>
              {quote.deposit_cents > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <dt>
                    {quote.deposit_type === "percent"
                      ? t("document.depositPercent", { percent: String(quote.deposit_value) })
                      : t("document.deposit")}
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
            <h2 className="text-sm font-semibold">{tc("labels.notes")}</h2>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{quote.notes}</p>
          </div>
        )}

        {quote.terms && (
          <div className="flex flex-col gap-1.5">
            <h2 className="text-sm font-semibold">{t("document.terms")}</h2>
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
          {t("document.print")}
        </Button>
        {live && (
          <>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={onDecline}
            >
              <XIcon />
              {t("decline.button")}
            </Button>
            <Button size="lg" onClick={onAccept}>
              <CheckIcon />
              {t("accept.action")}
            </Button>
          </>
        )}
      </div>
    </>
  );
}
