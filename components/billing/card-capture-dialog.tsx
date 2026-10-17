"use client";

import { useEffect, useRef, useState } from "react";
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

/** app/globals.css --primary (oklch 0.5 0.134 242.749) as the sRGB hex PA needs. */
const BRAND_PRIMARY_HEX = "#0069a8";

/** Payload of the Pay Advantage iframe's "complete" event. */
interface PayAdvantageCompleteDetail {
  status?: string;
  failReason?: string;
  customerPaymentAccount?: { code?: string } | null;
}

interface PayAdvantagePaymentIFrameInstance {
  initialise(
    iframe: HTMLIFrameElement,
    url: string,
    options: { showCard?: boolean; showSummary?: boolean; colorPrimary?: string }
  ): void;
  addEventListener(
    name: "complete",
    listener: (event: CustomEvent<PayAdvantageCompleteDetail>) => void
  ): void;
  dispose(): void;
}

declare global {
  interface Window {
    PayAdvantagePaymentIFrame?: new () => PayAdvantagePaymentIFrameInstance;
  }
}

const loadedStylesheets = new Set<string>();
const scriptPromises = new Map<string, Promise<void>>();

function loadStylesheet(href: string): void {
  if (loadedStylesheets.has(href)) return;
  loadedStylesheets.add(href);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src: string): Promise<void> {
  const existing = scriptPromises.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Drop the cached failure so a retry can create a fresh tag.
      scriptPromises.delete(src);
      script.remove();
      reject(new Error("The payment form failed to load. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  scriptPromises.set(src, promise);
  return promise;
}

type Phase = "loading" | "ready" | "saving" | "processing" | "error";

/**
 * Pay Advantage hosted card capture: a $0 tokenization inside their
 * PCI-compliant iframe — the card number never touches our code. The captured
 * token is posted to /billing/payment-method, which resolves the display
 * fields server-side and immediately charges anything blocked on a card
 * (initial subscription charge, dunning retry).
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

  const [phase, setPhase] = useState<Phase>("loading");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const instanceRef = useRef<PayAdvantagePaymentIFrameInstance | null>(null);
  // The init effect must never re-run because a parent re-rendered with a new
  // callback identity — that would tear down a live iframe. Refs keep it
  // keyed on open/attempt alone.
  const onOpenChangeRef = useRef(onOpenChange);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const saveToken = (token: string) => {
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
    };

    const handleComplete = (event: CustomEvent<PayAdvantageCompleteDetail>) => {
      if (cancelled) return;
      const detail = event.detail ?? {};

      // Declines keep the iframe live — the user just tries another card.
      if (detail.status === "failed") {
        toast.error(detail.failReason || "The card was declined. Please try another card.");
        return;
      }

      const token = detail.customerPaymentAccount?.code;
      if (token) {
        saveToken(token);
        return;
      }

      // No token and not failed: the gateway hasn't settled the attempt.
      // The backend reconciles on its own — nothing for the user to redo.
      if (detail.status === "undetermined") {
        setPhase("processing");
        return;
      }

      toast.error("The payment form returned an unexpected result. Please try again.");
    };

    const start = async () => {
      setPhase("loading");
      setSetupError(null);
      try {
        const session = await createSession();
        if (cancelled) return;

        // The fake dev gateway has no hosted form — it expects a fabricated
        // token straight back (resolvePaymentMethod invents display fields).
        if (session.mode !== "iframe" || !session.script_url || !session.stylesheet_url) {
          saveToken(`fake_tok_${session.session_id}`);
          return;
        }

        loadStylesheet(session.stylesheet_url);
        await loadScript(session.script_url);
        if (cancelled || !iframeRef.current) return;

        const PaymentIFrame = window.PayAdvantagePaymentIFrame;
        if (!PaymentIFrame) {
          throw new Error("The payment form failed to load. Please try again.");
        }

        const instance = new PaymentIFrame();
        instanceRef.current = instance;
        instance.addEventListener("complete", handleComplete);
        instance.initialise(iframeRef.current, session.url, {
          showCard: true,
          showSummary: false,
          colorPrimary: BRAND_PRIMARY_HEX,
        });
        setPhase("ready");
      } catch (error) {
        if (cancelled) return;
        setPhase("error");
        setSetupError(
          error instanceof Error ? error.message : "The payment form failed to load."
        );
      }
    };

    void start();

    return () => {
      cancelled = true;
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, [open, attempt, createSession, saveCard, intent]);

  const description =
    intent === "activate"
      ? "Card details go straight to Pay Advantage's secure form — we never see the number. Saving the card starts your subscription."
      : retriesFailedCharge
        ? "Saving a new card immediately retries the failed charge — service is restored as soon as it succeeds."
        : "Card details go straight to Pay Advantage's secure form — we never see the number. Future charges use the new card.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
                The payment provider is still confirming your card. Your subscription updates
                automatically the moment it settles — this can take a minute. It&apos;s safe to
                close this window.
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
          <div className="relative">
            {/* Pay Advantage's script resizes the iframe to fit its content.
                No src: an empty-string src makes the browser load the parent
                page inside the frame; initialise() navigates it to the
                gateway URL. */}
            <iframe
              id="payment_iframe"
              allow="payment"
              title="Secure card entry"
              ref={iframeRef}
              className="min-h-96 w-full rounded-md"
            />
            {phase !== "ready" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md bg-background/80">
                <Spinner className="size-6" />
                {phase === "saving" && (
                  <p className="text-sm text-muted-foreground">Saving your card…</p>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
