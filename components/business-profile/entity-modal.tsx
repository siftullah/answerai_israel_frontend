"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormContext, useFormState } from "react-hook-form";
import { CheckIcon } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface EntityModalStep {
  title: string;
  /** Top-level form field names this step owns — validated by Next and used
   * to route validation/server errors back to the step that shows them. */
  fields: string[];
  /** Extra imperative gate run by Next alongside trigger (e.g. file checks). */
  validate?: () => boolean | Promise<boolean>;
  content: React.ReactNode;
}

/**
 * Shared multi-step entity-form modal. Must be rendered inside the
 * consumer's react-hook-form `FormProvider` — it validates the active
 * step's fields on Next, renders `root.server` errors itself, and jumps
 * to the first step holding an error after a failed submit.
 * Closing while dirty asks before discarding.
 */
export function EntityModal({
  open,
  onOpenChange,
  title,
  description,
  steps,
  onSubmit,
  submitLabel,
  submitClassName,
  pending,
  isDirty,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  steps: EntityModalStep[];
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  /** Extra classes for the submit button (e.g. a one-off brand color). */
  submitClassName?: string;
  pending?: boolean;
  isDirty: boolean;
}) {
  const t = useTranslations("businessProfile.entityModal");
  const tc = useTranslations("common");
  const form = useFormContext();
  const { errors, submitCount } = useFormState();

  const [activeStep, setActiveStep] = useState(0);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const isLast = activeStep === steps.length - 1;

  const fieldError = (name: string) => (errors as Record<string, unknown>)[name];
  const isServerError = (name: string) =>
    (fieldError(name) as { type?: string } | undefined)?.type === "server";
  const firstErroredStep = (pred: (name: string) => boolean) =>
    steps.findIndex((step) => step.fields.some(pred));

  // Render-time derived-state resets/jumps (no effects — React re-renders
  // immediately with the adjusted state before committing).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setActiveStep(0);
  }

  // After a failed client-side submit (handleSubmit sets all errors at once
  // and bumps submitCount), bring the first errored step into view.
  const [handledSubmitCount, setHandledSubmitCount] = useState(submitCount);
  if (submitCount !== handledSubmitCount) {
    setHandledSubmitCount(submitCount);
    const index = firstErroredStep((name) => Boolean(fieldError(name)));
    if (index !== -1 && index !== activeStep) setActiveStep(index);
  }

  // Same for server 422s: applyServerErrors marks them type "server", and
  // typing can only clear those, so this never fires mid-edit.
  const serverSignature = steps
    .flatMap((step) => step.fields.filter(isServerError))
    .join(",");
  const [handledServerSignature, setHandledServerSignature] = useState("");
  if (serverSignature !== handledServerSignature) {
    setHandledServerSignature(serverSignature);
    if (serverSignature) {
      const index = firstErroredStep(isServerError);
      if (index !== -1 && index !== activeStep) setActiveStep(index);
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onOpenChange(next);
  };

  const handleNext = async () => {
    const step = steps[activeStep];
    const triggerOk =
      step.fields.length === 0 ||
      (await form.trigger(step.fields, { shouldFocus: true }));
    const customOk = step.validate ? await step.validate() : true;
    if (triggerOk && customOk) {
      setActiveStep((current) => Math.min(current + 1, steps.length - 1));
    }
  };

  // Intercept Enter-key submits from non-final steps — they should advance,
  // not run the consumer's full submit.
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!isLast) {
      event.preventDefault();
      void handleNext();
      return;
    }
    onSubmit(event);
  };

  const rootServerError = (
    errors.root as Record<string, { message?: string }> | undefined
  )?.server;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          {steps.length > 1 && (
            <ol className="flex flex-wrap items-center gap-2.5">
              {steps.map((step, index) => (
                <li key={step.title} className="flex items-center gap-2.5">
                  {index > 0 && <span aria-hidden className="h-px w-8 bg-border" />}
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                      index === activeStep && "bg-primary text-primary-foreground",
                      index < activeStep && "border border-primary/40 text-primary",
                      index > activeStep && "border text-muted-foreground"
                    )}
                  >
                    {index < activeStep ? <CheckIcon className="size-4" /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      "hidden text-sm sm:inline",
                      index === activeStep ? "font-medium" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                </li>
              ))}
            </ol>
          )}

          <form
            onSubmit={handleFormSubmit}
            noValidate
            className="flex min-h-0 min-w-0 flex-col gap-6"
          >
            {rootServerError && (
              <Alert variant="destructive">
                <AlertDescription>{rootServerError.message}</AlertDescription>
              </Alert>
            )}

            <div className="-mx-1 flex max-h-[60vh] min-h-64 min-w-0 flex-col gap-5 overflow-y-auto px-1 py-0.5">
              {steps[activeStep].content}
            </div>

            <DialogFooter>
              {activeStep > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setActiveStep((current) => Math.max(current - 1, 0))}
                >
                  {tc("actions.back")}
                </Button>
              )}
              {isLast ? (
                // Distinct keys so React swaps the DOM node instead of
                // morphing type="button" into type="submit" — the async Next
                // handler advances the step DURING the click dispatch, and a
                // morphed submit button would make that same click submit the
                // form, skipping the final step.
                <Button key="submit" type="submit" className={submitClassName} disabled={pending}>
                  {pending && <Spinner />}
                  {submitLabel}
                </Button>
              ) : (
                <Button key="next" type="button" onClick={() => void handleNext()}>
                  {tc("actions.next")}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("discardDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("discardDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.keepEditing")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                onOpenChange(false);
              }}
            >
              {tc("actions.discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
