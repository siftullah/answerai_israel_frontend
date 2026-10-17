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
import { useSendInvoice } from "@/hooks/use-invoices";
import { useModuleSettings } from "@/hooks/use-modules";
import { formatDateKey } from "@/lib/datetime";
import { formatCents } from "@/lib/money";
import type { Invoice, InvoiceModuleSettings } from "@/lib/api/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sending locks the draft: the backend stamps the issue date (today if unset),
 * derives the due date from the net terms, and emails the customer. The
 * contact's primary email is the default recipient; the field overrides it.
 */
export function SendInvoiceDialog({
  open,
  onOpenChange,
  businessUuid,
  invoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessUuid: string;
  invoice: Invoice;
}) {
  const sendInvoice = useSendInvoice(businessUuid);
  const settingsQuery = useModuleSettings<InvoiceModuleSettings>(businessUuid, "invoices");
  const contactQuery = useContact(businessUuid, invoice.contact?.id ?? null);

  const [toEmail, setToEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const emails = contactQuery.data?.emails ?? [];
  const primaryEmail = emails.find((e) => e.primary)?.email ?? emails[0]?.email ?? null;
  const contactLoaded = contactQuery.isSuccess;
  const netDays = settingsQuery.data?.net_days ?? 14;

  const missingRecipient = contactLoaded && primaryEmail === null && toEmail.trim() === "";

  const datesLine = invoice.issue_date
    ? `Issued ${formatDateKey(invoice.issue_date)}, due ${
        invoice.due_date ? formatDateKey(invoice.due_date) : `${netDays} days later`
      }.`
    : `The issue date will be set to today and the due date ${netDays} days later.`;

  const submit = () => {
    const override = toEmail.trim();
    if (override !== "" && !EMAIL_PATTERN.test(override)) {
      setFieldError("Enter a valid email address");
      return;
    }
    if (missingRecipient) {
      setFieldError("This contact has no email — enter one to send to");
      return;
    }

    sendInvoice.mutate(
      { id: invoice.id, ...(override !== "" ? { to_email: override } : {}) },
      {
        onSuccess: () => {
          toast.success(`Invoice ${invoice.number} sent`);
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
          <DialogTitle>Send invoice {invoice.number}</DialogTitle>
          <DialogDescription>
            Emails {invoice.contact?.name ?? "the customer"} an invoice for{" "}
            {formatCents(invoice.total_cents, invoice.currency)}. {datesLine}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field data-invalid={!!fieldError || undefined}>
            <FieldLabel htmlFor="send-invoice-email">Email to</FieldLabel>
            <Input
              id="send-invoice-email"
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
              <FieldDescription>
                Leave blank to send to {primaryEmail}.
              </FieldDescription>
            ) : null}
          </Field>

          {missingRecipient && (
            <Alert variant="destructive">
              <AlertDescription>
                {invoice.contact?.name ?? "This contact"} has no email address on file. Enter one
                above, or the invoice will be marked sent without emailing anyone.
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
          <Button type="button" onClick={submit} disabled={sendInvoice.isPending}>
            <SendIcon />
            {sendInvoice.isPending ? "Sending…" : "Send invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
