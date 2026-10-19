"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useBusiness } from "@/components/business/business-provider";
import { useFaqCategories } from "@/hooks/use-faq-categories";
import { useUpdateFaq } from "@/hooks/use-faqs";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import type { Faq } from "@/lib/api/types";
import { ownedFaqSchema, type OwnedFaqValues } from "@/lib/validation/faq";

/** Edits a service/product-owned FAQ copy (no agent scope of its own). */
export function OwnedFaqDialog({
  open,
  onOpenChange,
  faq,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faq: Faq;
}) {
  const { business } = useBusiness();
  const t = useTranslations("knowledge.faqs");
  const tc = useTranslations("common");
  const categoriesQuery = useFaqCategories(business.id);

  // Base UI's SelectValue renders the raw value unless the root knows the
  // item labels — without this the trigger shows the category's uuid.
  const categoryItems = [
    { value: "none", label: t("noCategory") },
    ...(categoriesQuery.data ?? []).map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];
  const update = useUpdateFaq(business.id);

  const tv = useTranslations("validation");
  const schema = useMemo(() => ownedFaqSchema(tv), [tv]);
  const form = useForm<OwnedFaqValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      question: faq.question,
      answer: faq.answer,
      faq_category_id: faq.category?.id ?? "",
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(
      {
        id: faq.id,
        payload: {
          question: values.question.trim(),
          answer: values.answer.trim(),
          faq_category_id: values.faq_category_id === "" ? null : values.faq_category_id,
        },
      },
      {
        onSuccess: () => {
          toast.success(t("toasts.saved"));
          onOpenChange(false);
        },
        onError: (error) => applyServerErrors(form, error),
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("modal.editTitle")}</DialogTitle>
          <DialogDescription>{t("owned.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {errors.root?.server && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.server.message}</AlertDescription>
            </Alert>
          )}

          <Field data-invalid={!!errors.question || undefined}>
            <FieldLabel htmlFor="owned-faq-question">{t("question")}</FieldLabel>
            <Input
              id="owned-faq-question"
              placeholder={t("questionPlaceholder")}
              autoComplete="off"
              aria-invalid={!!errors.question}
              {...form.register("question")}
            />
            {errors.question && <FieldError>{errors.question.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.answer || undefined}>
            <FieldLabel htmlFor="owned-faq-answer">{t("answer")}</FieldLabel>
            <Textarea
              id="owned-faq-answer"
              className="min-h-40"
              placeholder={t("answerPlaceholder")}
              aria-invalid={!!errors.answer}
              {...form.register("answer")}
            />
            {errors.answer && <FieldError>{errors.answer.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="owned-faq-category">{t("category")}</FieldLabel>
            <Controller
              control={form.control}
              name="faq_category_id"
              render={({ field }) => (
                <Select
                  items={categoryItems}
                  value={field.value || "none"}
                  onValueChange={(value) =>
                    field.onChange(value === "none" || value === null ? "" : (value as string))
                  }
                >
                  <SelectTrigger id="owned-faq-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Spinner />}
              {tc("actions.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
