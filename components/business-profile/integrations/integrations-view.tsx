"use client";

import { useState } from "react";
import { CheckIcon, CircleAlertIcon, MinusIcon, PlugIcon } from "lucide-react";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness } from "@/components/business/business-provider";
import { IntegrationDialog } from "@/components/business-profile/integrations/integration-dialog";
import {
  useDisconnectIntegration,
  useIntegrationProviders,
} from "@/hooks/use-integrations";
import { formatDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { IntegrationProviderInfo } from "@/lib/api/types";

const PROVIDER_LOGOS: Record<string, string> = {
  realestate_com_au: "/integrations/realestate-com-au.png",
};

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  realestate_com_au: "Get property listings to feed your AI agents.",
};

function ProviderLogo({ provider }: { provider: IntegrationProviderInfo }) {
  const logo = PROVIDER_LOGOS[provider.key];
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={provider.name}
        className="h-14 w-auto max-w-48 object-contain"
      />
    );
  }
  return (
    <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
      <PlugIcon className="size-6 text-muted-foreground" />
    </div>
  );
}

/** Card-sized status pill: bigger than the stock badge, with a status glyph. */
const connectionBadgeClassName = "h-7 gap-1.5 px-3 text-[13px] font-semibold";

function ConnectionState({
  provider,
  timeZone,
}: {
  provider: IntegrationProviderInfo;
  timeZone: string;
}) {
  const connection = provider.connection;
  if (!connection || connection.status === "disconnected") {
    return (
      <Badge variant="outline" className={cn(connectionBadgeClassName, "text-muted-foreground")}>
        <span className="size-2 rounded-full bg-muted-foreground/50" />
        Not connected
      </Badge>
    );
  }
  if (connection.status === "pending_setup") {
    return (
      <div className="flex flex-col gap-1.5">
        <Badge
          variant="warning"
          className={cn(connectionBadgeClassName, "border-warning/30 bg-warning/15")}
        >
          <Spinner className="size-3" />
          Connecting
        </Badge>
        <p className="text-sm text-muted-foreground">
          Finishing the first sync — this usually takes a few seconds.
        </p>
      </div>
    );
  }
  if (connection.status === "error") {
    return (
      <div className="flex flex-col gap-1.5">
        <Badge
          variant="destructive"
          className={cn(connectionBadgeClassName, "border-destructive/30 bg-destructive/15")}
        >
          <CircleAlertIcon />
          Error
        </Badge>
        <p className="text-sm text-muted-foreground">
          {connection.error ? `${connection.error} ` : ""}
          Check the settings under Manage to retry.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Badge
        variant="success"
        className={cn(connectionBadgeClassName, "border-success/30 bg-success/15")}
      >
        <span className="size-2 rounded-full bg-success" />
        Connected
      </Badge>
      {connection.last_synced_at && (
        <p className="text-sm text-muted-foreground">
          Last synced {formatDateTime(connection.last_synced_at, timeZone)}
        </p>
      )}
    </div>
  );
}

export function IntegrationsView() {
  const { business } = useBusiness();

  const providersQuery = useIntegrationProviders(business.id);
  const disconnect = useDisconnectIntegration(business.id);

  const [dialogProvider, setDialogProvider] = useState<IntegrationProviderInfo | null>(null);
  const [disconnecting, setDisconnecting] = useState<IntegrationProviderInfo | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Integrations"
        description="Connect external platforms that feed your AI's knowledge."
      />

      {providersQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : providersQuery.isError ? (
        <ErrorState
          title="Couldn't load integrations"
          message={providersQuery.error.message}
          onRetry={() => providersQuery.refetch()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {providersQuery.data.map((provider) => {
            const live =
              provider.connection && provider.connection.status !== "disconnected";
            // Live connections show the actual selection; otherwise the
            // full catalog stays as marketing copy.
            const enabledFeeds = live
              ? (provider.connection?.settings?.feeds ?? null)
              : null;
            return (
              <Card key={provider.key}>
                <CardHeader>
                  <ProviderLogo provider={provider} />
                  <CardTitle className="sr-only">{provider.name}</CardTitle>
                  <CardDescription>
                    {PROVIDER_DESCRIPTIONS[provider.key] ??
                      `Feeds your AI listings and data straight from ${provider.name}.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <ul className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                    {provider.feeds.map((feed) => {
                      const enabled = enabledFeeds === null || enabledFeeds.includes(feed.key);
                      return (
                        <li
                          key={feed.key}
                          className={cn(
                            "flex items-start gap-2 text-sm",
                            !enabled && "opacity-60"
                          )}
                        >
                          {enabled ? (
                            <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                          ) : (
                            <MinusIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <div className="min-w-0">
                            <p className={cn("font-medium", !enabled && "text-muted-foreground")}>
                              {feed.name}
                            </p>
                            {feed.description && (
                              <p className="text-sm text-muted-foreground">
                                {feed.description}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <ConnectionState provider={provider} timeZone={business.timezone} />
                    {live ? (
                      <div className="flex items-center gap-2">
                        <Button
                          className="bg-[#30aece] text-white hover:bg-[#30aece]/90"
                          onClick={() => setDialogProvider(provider)}
                        >
                          Manage
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setDisconnecting(provider)}
                          disabled={disconnect.isPending}
                        >
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={() => setDialogProvider(provider)}>Connect</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {dialogProvider && (
        <IntegrationDialog
          open
          onOpenChange={(next) => {
            if (!next) setDialogProvider(null);
          }}
          provider={dialogProvider}
        />
      )}

      <AlertDialog
        open={disconnecting !== null}
        onOpenChange={(next) => {
          if (!next) setDisconnecting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {disconnecting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its property listings are removed from your AI&apos;s knowledge and its
              feeds stop updating.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const connection = disconnecting?.connection;
                if (!connection) return;
                disconnect.mutate(connection.id, {
                  onSuccess: (result) => toast.success(result.message),
                  onError: (error) => toast.error(error.message),
                });
                setDisconnecting(null);
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
