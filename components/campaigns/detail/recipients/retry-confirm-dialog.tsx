"use client";

import { useTranslations } from "next-intl";
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
import type { Translator } from "@/lib/i18n/types";
import { formatE164 } from "@/lib/phone";

export type RetryTarget =
  | { kind: "single"; recipient: CampaignRecipient }
  | { kind: "ids"; ids: string[] }
  | { kind: "all-failed" };

/** `t` is scoped to campaigns.recipients.retryDialog. */
function titleFor(target: RetryTarget, t: Translator): string {
  if (target.kind === "single") {
    return t("titleSingle", { phone: formatE164(target.recipient.to_e164) });
  }
  if (target.kind === "ids") return t("titleIds", { count: target.ids.length });
  return t("titleAllFailed");
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
  const t = useTranslations("campaigns.recipients.retryDialog");
  const tc = useTranslations("common");
  const reopens = campaign.status === "completed";
  const endPassed = campaign.end_at !== null && new Date(campaign.end_at) < new Date();

  return (
    <AlertDialog open={target !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{target ? titleFor(target, t) : ""}</AlertDialogTitle>
          <AlertDialogDescription>
            {target?.kind === "ids" ? t("descriptionIds") : t("description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {reopens && (
          <Alert>
            <AlertDescription>{t("reopens")}</AlertDescription>
          </Alert>
        )}
        {endPassed && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>{t("endPassed")}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onGoToSettings();
                }}
              >
                {t("openSettings")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (target) onConfirm(target);
            }}
          >
            {tc("actions.retry")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
