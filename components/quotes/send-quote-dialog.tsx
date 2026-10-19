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
  const t = useTranslations("quotes");
  const tc = useTranslations("common");
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
    ? quote.valid_until
      ? t("sendDialog.datesIssuedValid", {
          issued: formatDateKey(quote.issue_date),
          validUntil: formatDateKey(quote.valid_until),
        })
      : t("sendDialog.datesIssuedNoValid", {
          issued: formatDateKey(quote.issue_date),
          days: validDays,
        })
    : t("sendDialog.datesUnset", { days: validDays });

  const submit = () => {
    const override = toEmail.trim();
    if (override !== "" && !EMAIL_PATTERN.test(override)) {
      setFieldError(t("sendDialog.invalidEmail"));
      return;
    }

    sendQuote.mutate(
      { id: quote.id, ...(override !== "" ? { to_email: override } : {}) },
      {
        onSuccess: ({ emailed }) => {
          if (emailed) {
            toast.success(t("toasts.sent", { number: quote.number }));
          } else {
            toast.warning(t("toasts.sentNoEmail", { number: quote.number }));
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
          <DialogTitle>{t("sendDialog.title", { number: quote.number })}</DialogTitle>
          <DialogDescription>
            {t("sendDialog.description", {
              customer: quote.contact?.name ?? t("theCustomer"),
              amount: formatCents(quote.total_cents, quote.currency),
              dates: datesLine,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field data-invalid={!!fieldError || undefined}>
            <FieldLabel htmlFor="send-quote-email">{t("sendDialog.emailLabel")}</FieldLabel>
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
              <FieldDescription>
                {t("sendDialog.emailHint", { email: primaryEmail })}
              </FieldDescription>
            ) : null}
          </Field>

          {missingRecipient && (
            <Alert variant="warning">
              <AlertDescription>
                {t("sendDialog.noEmailAlert", {
                  name: quote.contact?.name ?? t("thisContact"),
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
          <Button type="button" onClick={submit} disabled={sendQuote.isPending}>
            <SendIcon />
            {sendQuote.isPending ? t("actions.sending") : t("actions.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
