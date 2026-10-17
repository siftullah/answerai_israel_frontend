"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useBusiness } from "@/components/business/business-provider";
import { useConnectIntegration, useUpdateIntegration } from "@/hooks/use-integrations";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import type { IntegrationProviderInfo } from "@/lib/api/types";
import {
  integrationSettingsSchema,
  toIntegrationSettingsPayload,
  toIntegrationSettingsValues,
  type IntegrationSettingsValues,
} from "@/lib/validation/integration";

/**
 * Connect or manage a provider connection. A disconnected record still
 * prefills the form (reconnect restores the old selection) but connects
 * via POST; only a live connection edits via PATCH — which also re-runs
 * the sync, making this the retry path for errored connections.
 */
export function IntegrationDialog({
  open,
  onOpenChange,
  provider,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: IntegrationProviderInfo;
}) {
  const { business } = useBusiness();
  const connect = useConnectIntegration(business.id);
  const update = useUpdateIntegration(business.id);

  const connection = provider.connection;
  const editing = Boolean(connection && connection.status !== "disconnected");

  const form = useForm<IntegrationSettingsValues>({
    resolver: zodResolver(integrationSettingsSchema),
    defaultValues: toIntegrationSettingsValues(
      connection,
      provider.feeds.map((feed) => feed.key)
    ),
  });
  const { errors } = form.formState;

  const pending = connect.isPending || update.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const settings = toIntegrationSettingsPayload(values);
    // The backend nests settings.* in validation errors; the form fields
    // are flat, and per-feed errors roll up onto the group.
    const onError = (error: Parameters<typeof applyServerErrors>[1]) =>
      applyServerErrors(form, error, {
        mapKey: (key) => key.replace(/^settings\./, "").replace(/^feeds\.\d+$/, "feeds"),
      });

    if (editing && connection) {
      update.mutate(
        { id: connection.id, payload: { settings } },
        {
          onSuccess: () => {
            toast.success("Settings saved — re-syncing now");
            onOpenChange(false);
          },
          onError,
        }
      );
    } else {
      connect.mutate(
        { provider: provider.key, settings },
        {
          onSuccess: () => {
            toast.success(`${provider.name} connected — syncing your listings now`);
            onOpenChange(false);
          },
          onError,
        }
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Manage ${provider.name}` : `Connect ${provider.name}`}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Changes re-run the sync straight away. Feeds you untick have their listings removed from your AI's knowledge."
              : "Enter your agency ID and choose which listing feeds keep your AI up to date."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {errors.root?.server && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.server.message}</AlertDescription>
            </Alert>
          )}

          <Field data-invalid={!!errors.agency_id || undefined}>
            <FieldLabel htmlFor="integration-agency-id">Agency ID</FieldLabel>
            <Input
              id="integration-agency-id"
              placeholder="e.g. XNWXYZ"
              autoComplete="off"
              maxLength={50}
              aria-invalid={!!errors.agency_id}
              {...form.register("agency_id")}
            />
            <FieldDescription>
              Your realestate.com.au agency identifier — your account manager or Agency
              Admin can provide it.
            </FieldDescription>
            {errors.agency_id && <FieldError>{errors.agency_id.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.feeds || undefined}>
            <FieldLabel>Listing feeds</FieldLabel>
            <Controller
              control={form.control}
              name="feeds"
              render={({ field }) => (
                <div className="flex flex-col gap-3">
                  {provider.feeds.map((feed) => (
                    <FieldLabel key={feed.key} htmlFor={`integration-feed-${feed.key}`}>
                      <Field orientation="horizontal">
                        <Checkbox
                          id={`integration-feed-${feed.key}`}
                          checked={field.value.includes(feed.key)}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked
                                ? [...field.value, feed.key]
                                : field.value.filter((key) => key !== feed.key)
                            )
                          }
                        />
                        <FieldContent>
                          <FieldTitle>{feed.name}</FieldTitle>
                          {feed.description && (
                            <FieldDescription>{feed.description}</FieldDescription>
                          )}
                        </FieldContent>
                      </Field>
                    </FieldLabel>
                  ))}
                </div>
              )}
            />
            {errors.feeds && (
              <FieldError>{errors.feeds.message ?? errors.feeds.root?.message}</FieldError>
            )}
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {editing ? "Save & re-sync" : "Connect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
