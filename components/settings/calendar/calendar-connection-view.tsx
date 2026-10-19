"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const t = useTranslations("settings.calendar");
  const { business } = useBusiness();
  const connectionsQuery = useCalendarConnections(business.id);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Landed back on this page from the Microsoft consent screen.
  useEffect(() => {
    const status = searchParams.get("connection");
    if (!status) return;
    if (status === "success") {
      toast.success(t("toasts.connected"));
    } else {
      // Coded errors the OAuth callback appends to the return URL.
      const code = searchParams.get("code");
      toast.error(
        code === "state_expired"
          ? t("errors.stateExpired")
          : code === "access_denied"
            ? t("errors.accessDenied")
            : code === "provider_error"
              ? t("errors.providerError")
              : t("errors.generic")
      );
    }
    router.replace(`/b/${business.id}/settings/calendar`);
  }, [searchParams, router, business.id, t]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />

      {connectionsQuery.isPending ? (
        <Skeleton className="h-48 w-full max-w-2xl" />
      ) : connectionsQuery.isError ? (
        <ErrorState
          title={t("loadError")}
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
  const t = useTranslations("settings.calendar.card");
  const tc = useTranslations("common");
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
            <CardTitle className="text-[#30aece]">{t("providerName")}</CardTitle>
          </div>
          <CardDescription>{t("notConnected")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={onConnect} disabled={connect.isPending}>
            {connect.isPending && <Spinner />}
            {t("connect")}
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
          <CardTitle className="text-[#30aece]">{t("providerName")}</CardTitle>
          {healthy ? (
            <Badge variant="success">{t("connected")}</Badge>
          ) : (
            <Badge variant="warning">{t("needsReconnecting")}</Badge>
          )}
        </div>
        <CardDescription>
          {primary.account_email
            ? t.rich("connectedAs", {
                email: primary.account_email,
                strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
              })
            : t("connectedNoEmail")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!healthy && (
          <Alert variant="warning">
            <AlertTitle>{t("reconnectTitle")}</AlertTitle>
            <AlertDescription>{primary.last_error ?? t("reconnectFallback")}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {!healthy && (
            <Button type="button" onClick={onConnect} disabled={connect.isPending}>
              {connect.isPending && <Spinner />}
              {t("reconnect")}
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
              {t("disconnect")}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("disconnectTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("disconnectDescription")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    disconnect.mutate(primary.id, {
                      onSuccess: () => toast.success(t("toasts.disconnected")),
                      onError: (error) => toast.error(error.message),
                    })
                  }
                >
                  {t("disconnect")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
