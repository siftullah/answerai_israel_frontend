"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useBusiness } from "@/components/business/business-provider";
import { AgentSelectField } from "@/components/phone-numbers/agent-select-field";
import { useAgents } from "@/hooks/use-agents";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useAvailablePhoneNumbers,
  usePurchasePhoneNumber,
} from "@/hooks/use-phone-numbers";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { formatE164, toAvailabilitySearchPattern } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { AvailablePhoneNumber } from "@/lib/api/types";
import {
  buyDetailsSchema,
  defaultBuyDetailsValues,
  toPurchasePayload,
  type BuyDetailsValues,
} from "@/lib/validation/phone-number";

/**
 * Two-step purchase: pick from live Twilio inventory, then name and route it.
 * Search runs as you type (debounced — the upstream Twilio call takes a
 * second or two), starting with an unfiltered search on open so the list is
 * never blank by default.
 */
export function BuyNumberDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("phoneNumbers");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const agentsQuery = useAgents(business.id);
  const purchase = usePurchasePhoneNumber(business.id);

  const [step, setStep] = useState<"pick" | "details">("pick");
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<AvailablePhoneNumber | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  // Auto-search on a debounce. Twilio rejects single-character patterns, so a
  // 1-char input keeps the previous results until another character lands.
  // (Render-time derived state — the entity-modal idiom, no effects.)
  const typed = useDebouncedValue(searchInput, 600).replace(/\s+/g, "");
  const pattern = toAvailabilitySearchPattern(typed);
  const [contains, setContains] = useState("");
  if (typed.length !== 1 && pattern !== contains) {
    setContains(pattern);
    setSelected(null);
    setPickError(null);
  }

  const availability = useAvailablePhoneNumbers(business.id, contains);

  const tv = useTranslations("validation");
  const schema = useMemo(() => buyDetailsSchema(tv), [tv]);
  const form = useForm<BuyDetailsValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultBuyDetailsValues(),
  });
  const { errors } = form.formState;
  const rootServerError = (
    errors.root as Record<string, { message?: string }> | undefined
  )?.server;

  const onSubmit = form.handleSubmit((values) => {
    if (!selected) return;
    purchase.mutate(toPurchasePayload(selected.e164, values), {
      onSuccess: () => {
        toast.success(t("toasts.purchaseStarted"));
        onOpenChange(false);
      },
      onError: (error) => {
        // Sniped between search and buy — send the user back to pick again.
        if (error.status === 409) {
          setStep("pick");
          setSelected(null);
          setPickError(t("buy.taken"));
          void availability.refetch();
          return;
        }
        applyServerErrors(form, error);
      },
    });
  });

  const results = availability.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("buy.title")}</DialogTitle>
          <DialogDescription>
            {step === "pick" ? t("buy.pickDescription") : t("buy.detailsDescription")}
          </DialogDescription>
        </DialogHeader>

        {step === "pick" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Input
                value={searchInput}
                placeholder={t("buy.searchPlaceholder")}
                autoComplete="off"
                aria-label={t("buy.searchLabel")}
                onChange={(event) =>
                  setSearchInput(event.target.value.replace(/[^0-9+\s]/g, "").slice(0, 20))
                }
              />
              <p className="text-xs text-muted-foreground">{t("buy.searchHint")}</p>
            </div>

            {pickError && (
              <Alert variant="destructive">
                <AlertDescription>{pickError}</AlertDescription>
              </Alert>
            )}

            {availability.isFetching ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : availability.isError ? (
              <Alert variant="destructive">
                <AlertDescription>{availability.error.message}</AlertDescription>
              </Alert>
            ) : results.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("buy.noMatches")}
              </p>
            ) : (
              // The inset padding keeps the selected row's ring from being
              // clipped by the scroll container.
              <div className="-mx-1 flex max-h-80 flex-col gap-2 overflow-y-auto px-1 py-1">
                {results.map((number) => (
                  <button
                    type="button"
                    key={number.e164}
                    onClick={() => setSelected(number)}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-start transition-colors hover:bg-accent",
                      selected?.e164 === number.e164 && "border-primary ring-1 ring-primary"
                    )}
                  >
                    <p className="font-medium">{formatE164(number.e164)}</p>
                    {number.locality && (
                      <p className="shrink-0 truncate text-sm text-muted-foreground">
                        {number.locality}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {tc("actions.cancel")}
              </Button>
              <Button type="button" disabled={!selected} onClick={() => setStep("details")}>
                {tc("actions.next")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          selected && (
            <FormProvider {...form}>
              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                {rootServerError && (
                  <Alert variant="destructive">
                    <AlertDescription>{rootServerError.message}</AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3">
                  <p className="font-medium">{formatE164(selected.e164)}</p>
                  {selected.locality && (
                    <p className="shrink-0 truncate text-sm text-muted-foreground">
                      {selected.locality}
                    </p>
                  )}
                </div>

                <Field data-invalid={!!errors.friendly_name || undefined}>
                  <FieldLabel htmlFor="buy-friendly-name">{t("form.friendlyName")}</FieldLabel>
                  <Input
                    id="buy-friendly-name"
                    placeholder={t("form.friendlyNamePlaceholder")}
                    autoComplete="off"
                    aria-invalid={!!errors.friendly_name}
                    {...form.register("friendly_name")}
                  />
                  {errors.friendly_name && (
                    <FieldError>{errors.friendly_name.message}</FieldError>
                  )}
                </Field>

                <AgentSelectField
                  name="inbound_agent_id"
                  slot="inbound"
                  agents={agentsQuery.data}
                  id="buy-inbound-agent"
                  optional
                />
                <AgentSelectField
                  name="outbound_agent_id"
                  slot="outbound"
                  agents={agentsQuery.data}
                  id="buy-outbound-agent"
                  optional
                />

                <p className="text-sm text-muted-foreground">{t("buy.agentsHint")}</p>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={purchase.isPending}
                    onClick={() => setStep("pick")}
                  >
                    {tc("actions.back")}
                  </Button>
                  <Button type="submit" disabled={purchase.isPending}>
                    {purchase.isPending && <Spinner />}
                    {t("page.buyNumber")}
                  </Button>
                </DialogFooter>
              </form>
            </FormProvider>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
