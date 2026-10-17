"use client";

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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Campaign, CampaignRecipient } from "@/lib/api/types";
import { formatE164 } from "@/lib/phone";

export type RetryTarget =
  | { kind: "single"; recipient: CampaignRecipient }
  | { kind: "ids"; ids: string[] }
  | { kind: "all-failed" };

function titleFor(target: RetryTarget): string {
  if (target.kind === "single") return `Retry ${formatE164(target.recipient.to_e164)}?`;
  if (target.kind === "ids") {
    return `Retry ${target.ids.length} ${target.ids.length === 1 ? "recipient" : "recipients"}?`;
  }
  return "Retry every failed or skipped recipient?";
}

/** One confirm for single, selected-ids and all-failed retries. */
export function RetryConfirmDialog({
  campaign,
  target,
  onOpenChange,
  onConfirm,
  onGoToSettings,
}: {
  campaign: Campaign;
  /** null = closed. AlertDialog stays mounted, per the destructive-confirm convention. */
  target: RetryTarget | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (target: RetryTarget) => void;
  onGoToSettings: () => void;
}) {
  const reopens = campaign.status === "completed";
  const endPassed = campaign.end_at !== null && new Date(campaign.end_at) < new Date();

  return (
    <AlertDialog open={target !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{target ? titleFor(target) : ""}</AlertDialogTitle>
          <AlertDialogDescription>
            {target?.kind === "ids"
              ? "Attempt counts reset to zero and dialing starts again. Rows that aren't failed or skipped are left alone."
              : "The attempt count resets to zero and dialing starts again."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {reopens && (
          <Alert>
            <AlertDescription>
              This campaign is completed — retrying reopens it and dialing resumes on the
              next tick.
            </AlertDescription>
          </Alert>
        )}
        {endPassed && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>
                The end date has already passed, so the campaign will complete again
                without dialing anyone. Extend or clear the end date first.
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onGoToSettings();
                }}
              >
                Open settings
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (target) onConfirm(target);
            }}
          >
            Retry
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
