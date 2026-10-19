"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { XIcon } from "lucide-react";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDeclineQuote } from "@/hooks/use-quotes";
import { formatCents } from "@/lib/money";
import type { Quote } from "@/lib/api/types";

/** Manual decline — the customer said no; the reason feeds the win-rate story. */
export function DeclineQuoteDialog({
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
  const declineQuote = useDeclineQuote(businessUuid);
  const [reason, setReason] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = reason.trim();
    declineQuote.mutate(
      { id: quote.id, ...(trimmed !== "" ? { reason: trimmed } : {}) },
      {
        onSuccess: () => {
          toast.success(t("toasts.declined", { number: quote.number }));
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
          <DialogTitle>{t("declineDialog.title", { number: quote.number })}</DialogTitle>
          <DialogDescription>
            {t("declineDialog.description", {
              customer: quote.contact?.name ?? t("theCustomer"),
              amount: formatCents(quote.total_cents, quote.currency),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="decline-quote-reason">
              {t("declineDialog.reasonLabel")}
            </FieldLabel>
            <Input
              id="decline-quote-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder={t("declineDialog.reasonPlaceholder")}
            />
            <FieldDescription>{t("declineDialog.reasonHint")}</FieldDescription>
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
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={declineQuote.isPending}
          >
            <XIcon />
            {declineQuote.isPending ? tc("actions.saving") : t("declineDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
