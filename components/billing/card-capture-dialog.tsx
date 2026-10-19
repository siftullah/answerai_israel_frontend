"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadStripe,
  type Stripe,
  type StripeElements,
  type StripePaymentElement,
} from "@stripe/stripe-js";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useSetupSession, useStorePaymentMethod } from "@/hooks/use-billing";
import type { Locale } from "@/i18n/config";

/** app/globals.css --primary (oklch 0.5 0.134 242.749) as the sRGB hex Stripe's appearance API takes. */
const BRAND_PRIMARY_HEX = "#0069a8";

type Phase = "loading" | "ready" | "saving" | "processing" | "error";

/**
 * Stripe card capture: the backend opens a SetupIntent (usage off_session)
 * and the browser confirms it with Stripe's Payment Element — the card
 * number never touches our code, and any 3DS challenge happens here with the
 * customer present. The resulting PaymentMethod id is posted to
 * /billing/payment-method, which proves it belongs to this business's Stripe
 * customer, resolves the display fields server-side and immediately charges
 * anything blocked on a card (initial subscription charge, dunning retry).
 */
export function CardCaptureDialog({
  businessUuid,
  open,
  onOpenChange,
  intent,
  retriesFailedCharge = false,
  onSuccess,
}: {
  businessUuid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** activate = first card of a fresh subscription; update = replace card. */
  intent: "activate" | "update";
  /** past_due/suspended — saving a card auto-retries the failed charge. */
  retriesFailedCharge?: boolean;
  onSuccess?: () => void;
}) {
  const t = useTranslations("billing.card");
  const tc = useTranslations("common");
  // en/he/ar/ru are all Stripe Elements locales — the card form follows the UI.
  const locale = useLocale() as Locale;
  const { mutateAsync: createSession } = useSetupSession();
  const { mutate: saveCard } = useStorePaymentMethod(businessUuid);
  const { resolvedTheme } = useTheme();

  const savedMessage = intent === "activate" ? t("toasts.activated") : t("toasts.updated");

  const [phase, setPhase] = useState<Phase>("loading");
  // null with phase "error" → the generic load-failed copy.
  const [setupError, setSetupError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const paymentElementRef = useRef<StripePaymentElement | null>(null);
  // The init effect must never re-run because a parent re-rendered with a new
  // callback identity (or the theme or UI language flipped) — that would tear
  // down a live card form. Refs keep it keyed on open/attempt alone.
  const onOpenChangeRef = useRef(onOpenChange);
  const onSuccessRef = useRef(onSuccess);
  const themeRef = useRef(resolvedTheme);
  const localeRef = useRef(locale);
  const savedMessageRef = useRef(savedMessage);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
    onSuccessRef.current = onSuccess;
    themeRef.current = resolvedTheme;
    localeRef.current = locale;
    savedMessageRef.current = savedMessage;
  });

  const saveToken = useCallback(
    (token: string) => {
      setPhase("saving");
      saveCard(
        { token },
        {
          onSuccess: () => {
            toast.success(savedMessageRef.current);
            onOpenChangeRef.current(false);
            onSuccessRef.current?.();
          },
          onError: (error) => {
            setPhase("ready");
            toast.error(error.message);
          },
        }
      );
    },
    [saveCard]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const start = async () => {
      setPhase("loading");
      setSetupError(null);
      try {
        const session = await createSession();
        if (cancelled) return;

        // The fake dev gateway has no card form — it expects a fabricated
        // token straight back (resolvePaymentMethod invents display fields).
        if (session.provider !== "stripe" || !session.client_secret || !session.publishable_key) {
          saveToken(`fake_tok_${session.session_id}`);
          return;
        }

        // Stripe.js must come from js.stripe.com (PCI) — loadStripe injects it
        // once and resolves null when the script is blocked.
        const stripe = await loadStripe(session.publishable_key);
        if (cancelled) return;
        if (!stripe || !containerRef.current) {
          setPhase("error");
          return;
        }

        const elements = stripe.elements({
          clientSecret: session.client_secret,
          locale: localeRef.current,
          appearance: {
            theme: themeRef.current === "dark" ? "night" : "stripe",
            variables: { colorPrimary: BRAND_PRIMARY_HEX },
          },
        });
        const paymentElement = elements.create("payment", { layout: "tabs" });
        stripeRef.current = stripe;
        elementsRef.current = elements;
        paymentElementRef.current = paymentElement;

        paymentElement.on("ready", () => {
          if (!cancelled) setPhase("ready");
        });
        paymentElement.on("loaderror", (event) => {
          if (cancelled) return;
          setPhase("error");
          setSetupError(event.error?.message ?? null);
        });
        paymentElement.mount(containerRef.current);
      } catch (error) {
        if (cancelled) return;
        setPhase("error");
        setSetupError(error instanceof Error ? error.message : null);
      }
    };

    void start();

    return () => {
      cancelled = true;
      paymentElementRef.current?.destroy();
      paymentElementRef.current = null;
      elementsRef.current = null;
      stripeRef.current = null;
    };
  }, [open, attempt, createSession, saveToken]);

  // Elements has no submit of its own: confirm the SetupIntent in-page, then
  // hand the PaymentMethod to the backend. Declines keep the form live.
  const submit = async () => {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements || phase !== "ready") return;

    setPhase("saving");
    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: window.location.href },
    });

    if (error) {
      setPhase("ready");
      // Incomplete fields are already flagged inline by the element itself.
      if (error.type !== "validation_error") {
        toast.error(error.message ?? t("toasts.declined"));
      }
      return;
    }

    if (setupIntent.status === "succeeded") {
      const paymentMethod =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id;
      // The backend also accepts the seti_ id, resolving the card through it.
      saveToken(paymentMethod ?? setupIntent.id);
      return;
    }

    // Confirmed but not settled: the backend reconciles on its own — nothing
    // for the user to redo.
    if (setupIntent.status === "processing") {
      setPhase("processing");
      return;
    }

    setPhase("ready");
    toast.error(t("toasts.unexpected"));
  };

  const description =
    intent === "activate"
      ? t("descriptionActivate")
      : retriesFailedCharge
        ? t("descriptionRetry")
        : t("descriptionUpdate");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {intent === "activate" ? t("titleActivate") : t("titleUpdate")}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {phase === "error" && (
          <>
            <Alert variant="destructive">
              <AlertTitle>{t("loadErrorTitle")}</AlertTitle>
              <AlertDescription>{setupError ?? t("loadFailed")}</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {tc("actions.close")}
              </Button>
              <Button onClick={() => setAttempt((n) => n + 1)}>{tc("actions.tryAgain")}</Button>
            </DialogFooter>
          </>
        )}

        {phase === "processing" && (
          <>
            <Alert variant="info">
              <AlertTitle>{t("processingTitle")}</AlertTitle>
              <AlertDescription>{t("processingBody")}</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {tc("actions.close")}
              </Button>
            </DialogFooter>
          </>
        )}

        {(phase === "loading" || phase === "ready" || phase === "saving") && (
          <>
            {/* The Payment Element can outgrow a short viewport (Link sign-up,
                extra fields per country) — the body scrolls, the footer stays. */}
            <div className="scrollbar-slim -me-2 min-h-0 flex-1 overflow-y-auto pe-2">
              <div className="relative">
                {/* Stripe mounts its Payment Element (an iframe per field) here. */}
                <div ref={containerRef} className="min-h-48" />
                {phase !== "ready" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md bg-background/80">
                    <Spinner className="size-6" />
                    {phase === "saving" && (
                      <p className="text-sm text-muted-foreground">{t("saving")}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={phase === "saving"}
              >
                {tc("actions.cancel")}
              </Button>
              <Button onClick={() => void submit()} disabled={phase !== "ready"}>
                {phase === "saving" && <Spinner data-icon="inline-start" />}
                {t("save")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
