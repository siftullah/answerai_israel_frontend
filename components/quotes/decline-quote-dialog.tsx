"use client";

import { useState } from "react";
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
  const declineQuote = useDeclineQuote(businessUuid);
  const [reason, setReason] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = reason.trim();
    declineQuote.mutate(
      { id: quote.id, ...(trimmed !== "" ? { reason: trimmed } : {}) },
      {
        onSuccess: () => {
          toast.success(`Quote ${quote.number} marked as declined`);
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
          <DialogTitle>Mark quote {quote.number} as declined</DialogTitle>
          <DialogDescription>
            Records that {quote.contact?.name ?? "the customer"} turned down the{" "}
            {formatCents(quote.total_cents, quote.currency)} quote. Declined is final — duplicate
            the quote to re-price the work.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="decline-quote-reason">Reason</FieldLabel>
            <Input
              id="decline-quote-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="Went with another provider"
            />
            <FieldDescription>Optional — why the customer said no.</FieldDescription>
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
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={declineQuote.isPending}
          >
            <XIcon />
            {declineQuote.isPending ? "Saving…" : "Mark as declined"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
