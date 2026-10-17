"use client";

import { useState } from "react";
import { SendIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useContact } from "@/hooks/use-contacts";
import { useSendQuote } from "@/hooks/use-quotes";
import { useModuleSettings } from "@/hooks/use-modules";
import { formatDateKey } from "@/lib/datetime";
import { formatCents } from "@/lib/money";
import type { Quote, QuoteModuleSettings } from "@/lib/api/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sending locks the draft: the backend stamps the issue date (today if unset),
 * derives the validity window, and emails the customer their accept link. The
 * contact's primary email is the default recipient; the field overrides it.
 * With no email at all the quote still activates — the public link is then the
 * way to share it, and the toast says so.
 */
export function SendQuoteDialog({
  open,
  onOpenChange,
  businessUuid,
  quote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessUuid: string;
  quote: Quote;
}) {
  const sendQuote = useSendQuote(businessUuid);
  const settingsQuery = useModuleSettings<QuoteModuleSettings>(businessUuid, "quotes");
  const contactQuery = useContact(businessUuid, quote.contact?.id ?? null);

  const [toEmail, setToEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const emails = contactQuery.data?.emails ?? [];
  const primaryEmail = emails.find((e) => e.primary)?.email ?? emails[0]?.email ?? null;
  const contactLoaded = contactQuery.isSuccess;
  const validDays = settingsQuery.data?.valid_days ?? 30;

  const missingRecipient = contactLoaded && primaryEmail === null && toEmail.trim() === "";

  const datesLine = quote.issue_date
    ? `Issued ${formatDateKey(quote.issue_date)}, valid until ${
        quote.valid_until ? formatDateKey(quote.valid_until) : `${validDays} days later`
      }.`
    : `The issue date will be set to today and the quote stays valid ${validDays} days.`;

  const submit = () => {
    const override = toEmail.trim();
    if (override !== "" && !EMAIL_PATTERN.test(override)) {
      setFieldError("Enter a valid email address");
      return;
    }

    sendQuote.mutate(
      { id: quote.id, ...(override !== "" ? { to_email: override } : {}) },
      {
        onSuccess: ({ emailed }) => {
          if (emailed) {
            toast.success(`Quote ${quote.number} sent`);
          } else {
            toast.warning(
              `Quote ${quote.number} is live, but no email went out — copy the link to share it.`
            );
          }
          onOpenChange(false);
        },
        onError: (error) => setServerError(error.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send quote {quote.number}</DialogTitle>
          <DialogDescription>
            Emails {quote.contact?.name ?? "the customer"} a quote for{" "}
            {formatCents(quote.total_cents, quote.currency)} with a link to accept online.{" "}
            {datesLine}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field data-invalid={!!fieldError || undefined}>
            <FieldLabel htmlFor="send-quote-email">Email to</FieldLabel>
            <Input
              id="send-quote-email"
              type="email"
              value={toEmail}
              onChange={(event) => {
                setToEmail(event.target.value);
                setFieldError(null);
              }}
              placeholder={primaryEmail ?? "name@example.com"}
              aria-invalid={!!fieldError}
            />
            {fieldError ? (
              <FieldError>{fieldError}</FieldError>
            ) : primaryEmail ? (
              <FieldDescription>Leave blank to send to {primaryEmail}.</FieldDescription>
            ) : null}
          </Field>

          {missingRecipient && (
            <Alert variant="warning">
              <AlertDescription>
                {quote.contact?.name ?? "This contact"} has no email address on file. You can still
                send — the quote goes live and you share its link by text or in person.
              </AlertDescription>
            </Alert>
          )}

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={sendQuote.isPending}>
            <SendIcon />
            {sendQuote.isPending ? "Sending…" : "Send quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
