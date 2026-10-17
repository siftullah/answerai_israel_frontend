"use client";

import { useState } from "react";
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
            toast.success(`Quote ${quote.number} re-sent`);
          } else {
            toast.warning(
              `Quote ${quote.number} is live again, but no email went out — copy the link to share it.`
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
          <DialogTitle>
            {expired ? `Revive quote ${quote.number}` : `Re-send quote ${quote.number}`}
          </DialogTitle>
          <DialogDescription>
            {expired
              ? "Puts the quote back in front of the customer with a fresh validity window."
              : "Sends the customer another email with the same accept link."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="resend-valid-until">Valid until</FieldLabel>
            <DatePicker
              id="resend-valid-until"
              value={validUntil}
              onChange={setValidUntil}
              clearable
              placeholder={`${validDays} days from today`}
            />
            <FieldDescription>
              Left blank, the quote stays valid {validDays} days from today.
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
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={resendQuote.isPending}>
            <SendIcon />
            {resendQuote.isPending ? "Sending…" : expired ? "Revive & re-send" : "Re-send quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
