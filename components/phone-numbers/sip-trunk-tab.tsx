"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";
import { useBusiness } from "@/components/business/business-provider";
import { CopyField } from "@/components/phone-numbers/copy-field";
import { SipCredentialsDialog } from "@/components/phone-numbers/sip-credentials-dialog";
import { usePhoneNumbers } from "@/hooks/use-phone-numbers";
import {
  useConnectSip,
  useDisconnectSip,
  useRotateSipCredentials,
  useSipConnection,
} from "@/hooks/use-sip-connection";
import { formatDate } from "@/lib/datetime";
import type { SipCredentials } from "@/lib/api/types";

/** The literal token the destination URI template carries — data, not copy. */
const NUMBER_PLACEHOLDER = "{your_number_e164}";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function SipTrunkTab() {
  const t = useTranslations("phoneNumbers");
  const tc = useTranslations("common");
  const { business } = useBusiness();

  const setupSteps = [
    t("sip.setup.stepCredentials"),
    t("sip.setup.stepPointTrunk"),
    t("sip.setup.stepRegister"),
  ];

  const sipQuery = useSipConnection(business.id);
  const numbersQuery = usePhoneNumbers(business.id);
  const connect = useConnectSip(business.id);
  const rotate = useRotateSipCredentials(business.id);
  const disconnect = useDisconnectSip(business.id);

  const [revealed, setRevealed] = useState<{
    credentials: SipCredentials;
    context: "connect" | "rotate";
  } | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const liveSipCount = (numbersQuery.data ?? []).filter(
    (number) => number.provider === "byo_sip" && number.status !== "released"
  ).length;

  const handleConnect = () => {
    connect.mutate(undefined, {
      onSuccess: (result) =>
        setRevealed({ credentials: result.credentials, context: "connect" }),
      onError: (error) => toast.error(error.message),
    });
  };

  if (sipQuery.isPending) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (sipQuery.isError) {
    return (
      <ErrorState
        title={t("sip.loadError")}
        message={sipQuery.error.message}
        onRetry={() => sipQuery.refetch()}
      />
    );
  }

  const connection = sipQuery.data;

  return (
    <>
      {connection === null ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{t("sip.setup.title")}</CardTitle>
            <CardDescription>{t("sip.setup.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {setupSteps.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="text-sm text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
          <CardFooter>
            <Button onClick={handleConnect} disabled={connect.isPending}>
              {connect.isPending && <Spinner />}
              {t("sip.setup.connect")}
            </Button>
          </CardFooter>
        </Card>
      ) : connection.status === "active" ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{t("tabs.sip")}</CardTitle>
              <Badge variant="success">{tc("labels.active")}</Badge>
            </div>
            <CardDescription>{t("sip.activeDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <DetailRow label={t("sipFields.username")} value={connection.username} />
            <DetailRow label={t("sipFields.domain")} value={connection.domain} />
            <DetailRow
              label={t("sip.connected")}
              value={formatDate(connection.connected_at, business.timezone)}
            />
            <DetailRow
              label={t("sip.lastRotated")}
              value={
                connection.last_rotated_at
                  ? formatDate(connection.last_rotated_at, business.timezone)
                  : t("sip.never")
              }
            />
            <div className="pt-2">
              {/* Derived from the domain — mirrors the backend's
                  destination_uri_format from the connect response. */}
              <CopyField
                label={t("sipFields.destinationUri")}
                value={`sip:${NUMBER_PLACEHOLDER}@${connection.domain}`}
                hint={t("sipFields.destinationHint", { placeholder: NUMBER_PLACEHOLDER })}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-wrap gap-x-2 gap-y-3">
            <Button
              variant="cta"
              onClick={() => setConfirmRotate(true)}
              disabled={rotate.isPending}
            >
              {rotate.isPending && <Spinner />}
              {t("sip.rotatePassword")}
            </Button>
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => setConfirmDisconnect(true)}
              disabled={liveSipCount > 0 || disconnect.isPending}
            >
              {disconnect.isPending && <Spinner />}
              {t("sip.disconnect")}
            </Button>
            {liveSipCount > 0 && (
              <p className="w-full text-sm text-muted-foreground">
                {t("sip.releaseFirst", { count: liveSipCount })}
              </p>
            )}
          </CardFooter>
        </Card>
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{t("tabs.sip")}</CardTitle>
              <Badge variant="secondary">{t("sip.disconnected")}</Badge>
            </div>
            <CardDescription>{t("sip.disconnectedDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {connection.disconnected_at && (
              <DetailRow
                label={t("sip.disconnected")}
                value={formatDate(connection.disconnected_at, business.timezone)}
              />
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleConnect} disabled={connect.isPending}>
              {connect.isPending && <Spinner />}
              {t("sip.reconnect")}
            </Button>
          </CardFooter>
        </Card>
      )}

      {revealed && (
        <SipCredentialsDialog
          credentials={revealed.credentials}
          context={revealed.context}
          onDone={() => setRevealed(null)}
        />
      )}

      <AlertDialog open={confirmRotate} onOpenChange={setConfirmRotate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sip.rotateDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("sip.rotateDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-cta text-cta-foreground hover:bg-cta/90"
              onClick={() => {
                setConfirmRotate(false);
                rotate.mutate(undefined, {
                  onSuccess: (result) =>
                    setRevealed({ credentials: result.credentials, context: "rotate" }),
                  onError: (error) => toast.error(error.message),
                });
              }}
            >
              {t("sip.rotatePassword")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sip.disconnectDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("sip.disconnectDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmDisconnect(false);
                disconnect.mutate(undefined, {
                  onSuccess: () => toast.success(t("toasts.sipDisconnected")),
                  onError: (error) => toast.error(error.message),
                });
              }}
            >
              {t("sip.disconnect")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
