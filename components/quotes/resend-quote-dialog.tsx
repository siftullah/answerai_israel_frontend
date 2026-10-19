"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SendIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { useResendQuote } from "@/hooks/use-quotes";
import { useModuleSettings } from "@/hooks/use-modules";
import type { Quote, QuoteModuleSettings } from "@/lib/api/types";

/**
 * Re-send nudges a sent quote, or revives an expired one with a fresh validity
 * window. The customer's original link keeps working either way.
 */
export function ResendQuoteDialog({
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
  const resendQuote = useResendQuote(businessUuid);
  const settingsQuery = useModuleSettings<QuoteModuleSettings>(businessUuid, "quotes");

  const [validUntil, setValidUntil] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const validDays = settingsQuery.data?.valid_days ?? 30;
  const expired = quote.status === "expired";

  const submit = () => {
    resendQuote.mutate(
      { id: quote.id, ...(validUntil ? { valid_until: validUntil } : {}) },
      {
        onSuccess: ({ emailed }) => {
          if (emailed) {
            toast.success(t("toasts.resent", { number: quote.number }));
          } else {
            toast.warning(t("toasts.resentNoEmail", { number: quote.number }));
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
          <DialogTitle>
            {expired
              ? t("resendDialog.reviveTitle", { number: quote.number })
              : t("resendDialog.resendTitle", { number: quote.number })}
          </DialogTitle>
          <DialogDescription>
            {expired
              ? t("resendDialog.reviveDescription")
              : t("resendDialog.resendDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="resend-valid-until">{t("labels.validUntil")}</FieldLabel>
            <DatePicker
              id="resend-valid-until"
              value={validUntil}
              onChange={setValidUntil}
              clearable
              placeholder={t("resendDialog.validUntilPlaceholder", { days: validDays })}
            />
            <FieldDescription>
              {t("resendDialog.validUntilHint", { days: validDays })}
            </FieldDescription>
          </Field>

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
          <Button type="button" onClick={submit} disabled={resendQuote.isPending}>
            <SendIcon />
            {resendQuote.isPending
              ? t("actions.sending")
              : expired
                ? t("actions.revive")
                : t("actions.resendQuote")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
