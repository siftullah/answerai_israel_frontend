"use client";

import { useState } from "react";
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

const SETUP_STEPS = [
  "We create digest credentials for you on our shared SIP domain.",
  "Point a trunk on your PBX or carrier at your destination URI.",
  "Register the numbers that trunk carries and route each to an agent.",
];

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function SipTrunkTab() {
  const { business } = useBusiness();

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
        title="Couldn't load your SIP connection"
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
            <CardTitle>Bring your own SIP trunk</CardTitle>
            <CardDescription>
              Keep your existing numbers and carrier — route their calls to your AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {SETUP_STEPS.map((step, index) => (
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
              Connect SIP trunk
            </Button>
          </CardFooter>
        </Card>
      ) : connection.status === "active" ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>SIP trunk</CardTitle>
              <Badge variant="success">Active</Badge>
            </div>
            <CardDescription>
              Your PBX authenticates against our shared SIP domain with these details.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <DetailRow label="Username" value={connection.username} />
            <DetailRow label="SIP domain" value={connection.domain} />
            <DetailRow
              label="Connected"
              value={formatDate(connection.connected_at, business.timezone)}
            />
            <DetailRow
              label="Last rotated"
              value={
                connection.last_rotated_at
                  ? formatDate(connection.last_rotated_at, business.timezone)
                  : "Never"
              }
            />
            <div className="pt-2">
              {/* Derived from the domain — mirrors the backend's
                  destination_uri_format from the connect response. */}
              <CopyField
                label="Destination URI"
                value={`sip:{your_number_e164}@${connection.domain}`}
                hint="Replace {your_number_e164} with each number you register."
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
              Rotate password
            </Button>
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => setConfirmDisconnect(true)}
              disabled={liveSipCount > 0 || disconnect.isPending}
            >
              {disconnect.isPending && <Spinner />}
              Disconnect
            </Button>
            {liveSipCount > 0 && (
              <p className="w-full text-sm text-muted-foreground">
                Release your {liveSipCount} SIP{" "}
                {liveSipCount === 1 ? "number" : "numbers"} before disconnecting.
              </p>
            )}
          </CardFooter>
        </Card>
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>SIP trunk</CardTitle>
              <Badge variant="secondary">Disconnected</Badge>
            </div>
            <CardDescription>
              Reconnecting issues fresh credentials — your old password will not come back.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {connection.disconnected_at && (
              <DetailRow
                label="Disconnected"
                value={formatDate(connection.disconnected_at, business.timezone)}
              />
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleConnect} disabled={connect.isPending}>
              {connect.isPending && <Spinner />}
              Reconnect
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
            <AlertDialogTitle>Rotate the SIP password?</AlertDialogTitle>
            <AlertDialogDescription>
              The current password stops working immediately — update your PBX with the
              new one straight away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
              Rotate password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect SIP trunk?</AlertDialogTitle>
            <AlertDialogDescription>
              Your trunk credentials stop working immediately. You can reconnect later —
              you&apos;ll get fresh credentials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmDisconnect(false);
                disconnect.mutate(undefined, {
                  onSuccess: () => toast.success("SIP trunk disconnected"),
                  onError: (error) => toast.error(error.message),
                });
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
