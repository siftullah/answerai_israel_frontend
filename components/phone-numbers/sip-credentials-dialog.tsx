"use client";

import { useState } from "react";
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
              {context === "rotate" ? "Your new SIP password" : "Your SIP credentials"}
            </DialogTitle>
            <DialogDescription>
              Point a trunk on your PBX or carrier at these details.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertDescription>
              Save these now — the password is shown only once and can&apos;t be retrieved
              later.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-3">
            <CopyField label="Username" value={credentials.username} />
            <CopyField label="Password" value={credentials.password} />
            <CopyField label="SIP domain" value={credentials.domain} />
            <CopyField
              label="Destination URI"
              value={credentials.destination_uri_format}
              hint="Replace {your_number_e164} with each number you register."
            />
          </div>

          <DialogFooter>
            <Button onClick={onDone}>I&apos;ve saved these credentials</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              You won&apos;t be able to see this password again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep them open</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmClose(false);
                onDone();
              }}
            >
              Close anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
