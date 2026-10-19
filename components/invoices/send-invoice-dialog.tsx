"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("invoices");
  const tc = useTranslations("common");
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
    ? invoice.due_date
      ? t("sendDialog.datesIssuedDue", {
          issued: formatDateKey(invoice.issue_date),
          due: formatDateKey(invoice.due_date),
        })
      : t("sendDialog.datesIssuedNoDue", {
          issued: formatDateKey(invoice.issue_date),
          days: netDays,
        })
    : t("sendDialog.datesUnset", { days: netDays });

  const submit = () => {
    const override = toEmail.trim();
    if (override !== "" && !EMAIL_PATTERN.test(override)) {
      setFieldError(t("sendDialog.invalidEmail"));
      return;
    }
    if (missingRecipient) {
      setFieldError(t("sendDialog.noEmailError"));
      return;
    }

    sendInvoice.mutate(
      { id: invoice.id, ...(override !== "" ? { to_email: override } : {}) },
      {
        onSuccess: () => {
          toast.success(t("toasts.sent", { number: invoice.number }));
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
          <DialogTitle>{t("sendDialog.title", { number: invoice.number })}</DialogTitle>
          <DialogDescription>
            {t("sendDialog.description", {
              customer: invoice.contact?.name ?? t("theCustomer"),
              amount: formatCents(invoice.total_cents, invoice.currency),
              dates: datesLine,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field data-invalid={!!fieldError || undefined}>
            <FieldLabel htmlFor="send-invoice-email">{t("sendDialog.emailLabel")}</FieldLabel>
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
                {t("sendDialog.emailHint", { email: primaryEmail })}
              </FieldDescription>
            ) : null}
          </Field>

          {missingRecipient && (
            <Alert variant="destructive">
              <AlertDescription>
                {t("sendDialog.noEmailAlert", {
                  name: invoice.contact?.name ?? t("thisContact"),
                })}
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
            {tc("actions.cancel")}
          </Button>
          <Button type="button" onClick={submit} disabled={sendInvoice.isPending}>
            <SendIcon />
            {sendInvoice.isPending ? t("actions.sending") : t("actions.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
