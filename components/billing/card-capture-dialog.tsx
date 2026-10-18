"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadStripe,
  type Stripe,
  type StripeElements,
  type StripePaymentElement,
} from "@stripe/stripe-js";
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

/** app/globals.css --primary (oklch 0.5 0.134 242.749) as the sRGB hex Stripe's appearance API takes. */
const BRAND_PRIMARY_HEX = "#0069a8";

const LOAD_FAILED = "The payment form failed to load. Check your connection and try again.";

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
  const { mutateAsync: createSession } = useSetupSession();
  const { mutate: saveCard } = useStorePaymentMethod(businessUuid);
  const { resolvedTheme } = useTheme();

  const [phase, setPhase] = useState<Phase>("loading");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const paymentElementRef = useRef<StripePaymentElement | null>(null);
  // The init effect must never re-run because a parent re-rendered with a new
  // callback identity (or the theme flipped) — that would tear down a live
  // card form. Refs keep it keyed on open/attempt alone.
  const onOpenChangeRef = useRef(onOpenChange);
  const onSuccessRef = useRef(onSuccess);
  const themeRef = useRef(resolvedTheme);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
    onSuccessRef.current = onSuccess;
    themeRef.current = resolvedTheme;
  });

  const saveToken = useCallback(
    (token: string) => {
      setPhase("saving");
      saveCard(
        { token },
        {
          onSuccess: () => {
            toast.success(
              intent === "activate" ? "Card saved — starting your subscription." : "Card updated."
            );
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
    [saveCard, intent]
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
          throw new Error(LOAD_FAILED);
        }

        const elements = stripe.elements({
          clientSecret: session.client_secret,
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
          setSetupError(event.error?.message ?? LOAD_FAILED);
        });
        paymentElement.mount(containerRef.current);
      } catch (error) {
        if (cancelled) return;
        setPhase("error");
        setSetupError(error instanceof Error ? error.message : LOAD_FAILED);
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
        toast.error(error.message ?? "The card was declined. Please try another card.");
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
    toast.error("The payment form returned an unexpected result. Please try again.");
  };

  const description =
    intent === "activate"
      ? "Card details go straight to Stripe's secure form — we never see the number. Saving the card starts your subscription."
      : retriesFailedCharge
        ? "Saving a new card immediately retries the failed charge — service is restored as soon as it succeeds."
        : "Card details go straight to Stripe's secure form — we never see the number. Future charges use the new card.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{intent === "activate" ? "Add your card" : "Update card"}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {phase === "error" && (
          <>
            <Alert variant="destructive">
              <AlertTitle>Couldn&apos;t open the payment form</AlertTitle>
              <AlertDescription>{setupError}</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
            </DialogFooter>
          </>
        )}

        {phase === "processing" && (
          <>
            <Alert variant="info">
              <AlertTitle>Payment is processing</AlertTitle>
              <AlertDescription>
                Stripe is still confirming your card. Your subscription updates automatically
                the moment it settles — this can take a minute. It&apos;s safe to close this
                window.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}

        {(phase === "loading" || phase === "ready" || phase === "saving") && (
          <>
            {/* The Payment Element can outgrow a short viewport (Link sign-up,
                extra fields per country) — the body scrolls, the footer stays. */}
            <div className="scrollbar-slim -mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
              <div className="relative">
                {/* Stripe mounts its Payment Element (an iframe per field) here. */}
                <div ref={containerRef} className="min-h-48" />
                {phase !== "ready" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md bg-background/80">
                    <Spinner className="size-6" />
                    {phase === "saving" && (
                      <p className="text-sm text-muted-foreground">Saving your card…</p>
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
                Cancel
              </Button>
              <Button onClick={() => void submit()} disabled={phase !== "ready"}>
                {phase === "saving" && <Spinner data-icon="inline-start" />}
                Save card
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
