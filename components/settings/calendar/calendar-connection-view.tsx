"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useBusiness } from "@/components/business/business-provider";
import {
  useCalendarConnections,
  useConnectCalendar,
  useDisconnectCalendar,
} from "@/hooks/use-calendar-connections";
import type { CalendarConnection } from "@/lib/api/types";

/** Coded errors the OAuth callback appends to the return URL. */
const CONNECT_ERRORS: Record<string, string> = {
  state_expired: "The connection request expired. Please try connecting again.",
  access_denied: "Microsoft sign-in was cancelled.",
  provider_error: "Microsoft couldn't complete the connection. Please try again.",
};

/** Decorative — the card title already names the provider. */
function OutlookLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand mark, not an optimizable content image
    <img
      src="/integrations/microsoft-outlook.svg"
      alt=""
      aria-hidden="true"
      className="size-9 shrink-0 object-contain"
    />
  );
}

export function CalendarConnectionView() {
  const { business } = useBusiness();
  const connectionsQuery = useCalendarConnections(business.id);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Landed back on this page from the Microsoft consent screen.
  useEffect(() => {
    const status = searchParams.get("connection");
    if (!status) return;
    if (status === "success") {
      toast.success("Calendar connected");
    } else {
      toast.error(
        CONNECT_ERRORS[searchParams.get("code") ?? ""] ?? "Couldn't connect your calendar"
      );
    }
    router.replace(`/b/${business.id}/settings/calendar`);
  }, [searchParams, router, business.id]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        description="Connect your Microsoft calendar so your AI can check your real availability and write appointments and callbacks straight to it."
      />

      {connectionsQuery.isPending ? (
        <Skeleton className="h-48 w-full max-w-2xl" />
      ) : connectionsQuery.isError ? (
        <ErrorState
          title="Couldn't load your calendar connection"
          message={connectionsQuery.error.message}
          onRetry={() => connectionsQuery.refetch()}
        />
      ) : (
        <MicrosoftConnectionCard businessUuid={business.id} connections={connectionsQuery.data} />
      )}
    </div>
  );
}

function MicrosoftConnectionCard({
  businessUuid,
  connections,
}: {
  businessUuid: string;
  connections: CalendarConnection[];
}) {
  const connect = useConnectCalendar();
  const disconnect = useDisconnectCalendar(businessUuid);

  const onConnect = () =>
    connect.mutate(
      { returnTo: `${window.location.origin}/b/${businessUuid}/settings/calendar` },
      { onError: (error) => toast.error(error.message) }
    );

  // At most one active connection per member; fall back to the newest row.
  const primary = connections.find((c) => c.is_active) ?? connections[0];

  if (!primary) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <OutlookLogo />
            <CardTitle className="text-[#30aece]">Microsoft Calendar</CardTitle>
          </div>
          <CardDescription>
            No calendar is connected yet. Connecting lets your AI offer your real availability and
            add appointments and callbacks straight to your calendar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={onConnect} disabled={connect.isPending}>
            {connect.isPending && <Spinner />}
            Connect Microsoft Calendar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const healthy = primary.status === "active";

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <OutlookLogo />
          <CardTitle className="text-[#30aece]">Microsoft Calendar</CardTitle>
          {healthy ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <Badge variant="warning">Needs reconnecting</Badge>
          )}
        </div>
        <CardDescription>
          {primary.account_email ? (
            <>
              Connected as{" "}
              <span className="font-medium text-foreground">{primary.account_email}</span>. Your
              appointments and callbacks sync to this calendar.
            </>
          ) : (
            "Your Microsoft calendar is connected — appointments and callbacks sync to it."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!healthy && (
          <Alert variant="warning">
            <AlertTitle>Reconnection required</AlertTitle>
            <AlertDescription>
              {primary.last_error ??
                "The connection stopped working. Reconnect to resume availability checks and syncing appointments and callbacks."}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {!healthy && (
            <Button type="button" onClick={onConnect} disabled={connect.isPending}>
              {connect.isPending && <Spinner />}
              Reconnect
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant={healthy ? "outline" : "ghost"}
                  disabled={disconnect.isPending}
                />
              }
            >
              {disconnect.isPending && <Spinner />}
              Disconnect
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect this calendar?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your AI will stop checking this calendar for availability, and new appointments
                  and callbacks won&apos;t be added to it. You can reconnect at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    disconnect.mutate(primary.id, {
                      onSuccess: () => toast.success("Calendar disconnected"),
                      onError: (error) => toast.error(error.message),
                    })
                  }
                >
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
