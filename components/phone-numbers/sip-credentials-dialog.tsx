"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyField } from "@/components/phone-numbers/copy-field";
import type { SipCredentials } from "@/lib/api/types";

/**
 * One-time credential reveal: the password exists only in this response, so
 * there's no X button and Esc/backdrop dismissals are intercepted behind a
 * "Close without saving?" confirm. The parent drops the credentials from
 * state in `onDone`.
 */
export function SipCredentialsDialog({
  credentials,
  context,
  onDone,
}: {
  credentials: SipCredentials;
  context: "connect" | "rotate";
  onDone: () => void;
}) {
  const t = useTranslations("phoneNumbers");
  const [confirmClose, setConfirmClose] = useState(false);

  return (
    <>
      <Dialog
        open
        onOpenChange={(next) => {
          if (!next) setConfirmClose(true);
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {context === "rotate" ? t("credentials.rotateTitle") : t("credentials.connectTitle")}
            </DialogTitle>
            <DialogDescription>{t("credentials.description")}</DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertDescription>{t("credentials.warning")}</AlertDescription>
          </Alert>

          <div className="flex flex-col gap-3">
            <CopyField label={t("sipFields.username")} value={credentials.username} />
            <CopyField label={t("sipFields.password")} value={credentials.password} />
            <CopyField label={t("sipFields.domain")} value={credentials.domain} />
            <CopyField
              label={t("sipFields.destinationUri")}
              value={credentials.destination_uri_format}
              hint={t("sipFields.destinationHint", { placeholder: "{your_number_e164}" })}
            />
          </div>

          <DialogFooter>
            <Button onClick={onDone}>{t("credentials.saved")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("credentials.closeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("credentials.closeDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("credentials.keepOpen")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmClose(false);
                onDone();
              }}
            >
              {t("credentials.closeAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
