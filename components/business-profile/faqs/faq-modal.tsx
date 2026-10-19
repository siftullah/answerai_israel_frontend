"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AgentScopeField } from "@/components/business-profile/agent-scope-field";
import { EntityModal } from "@/components/business-profile/entity-modal";
import { useBusiness } from "@/components/business/business-provider";
import { useFaqCategories } from "@/hooks/use-faq-categories";
import { useCreateFaq, useUpdateFaq } from "@/hooks/use-faqs";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { displayLocale } from "@/lib/i18n/runtime";
import type { Faq, FaqPayload } from "@/lib/api/types";
import { faqSchema, toFaqPayload, toFaqValues, type FaqValues } from "@/lib/validation/faq";

/**
 * Create/edit modal for business-wide FAQs. With onSubmitOverride the
 * validated payload is handed back instead of POSTed (extraction review).
 */
export function FaqModal({
  open,
  onOpenChange,
  source,
  onSubmitOverride,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: Faq | FaqPayload | null;
  onSubmitOverride?: (payload: FaqPayload) => void;
}) {
  const { business } = useBusiness();
  const t = useTranslations("knowledge.faqs");
  const ts = useTranslations("knowledge.shared");
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
  const create = useCreateFaq(business.id);
  const update = useUpdateFaq(business.id);

  const editing = Boolean(source && "id" in source);
  const title = onSubmitOverride
    ? ts("reviewDraft")
    : editing
      ? t("modal.editTitle")
      : t("add");
  const submitLabel = onSubmitOverride
    ? tc("actions.apply")
    : editing
      ? tc("actions.saveChanges")
      : t("add");

  const tv = useTranslations("validation");
  const schema = useMemo(() => faqSchema(tv), [tv]);
  const form = useForm<FaqValues>({
    resolver: zodResolver(schema),
    defaultValues: toFaqValues(source),
  });
  const { errors } = form.formState;
  const answerLength = form.watch("answer").length;

  const onSubmit = form.handleSubmit((values) => {
    const payload = toFaqPayload(values);
    if (onSubmitOverride) {
      onSubmitOverride(payload);
      onOpenChange(false);
      return;
    }
    if (source && "id" in source) {
      update.mutate(
        { id: (source as Faq).id, payload },
        {
          onSuccess: () => {
            toast.success(t("toasts.saved"));
            onOpenChange(false);
          },
          onError: (error) => applyServerErrors(form, error),
        }
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success(t("toasts.added"));
          onOpenChange(false);
        },
        onError: (error) => applyServerErrors(form, error),
      });
    }
  });

  return (
    <FormProvider {...form}>
      <EntityModal
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        onSubmit={onSubmit}
        submitLabel={submitLabel}
        pending={create.isPending || update.isPending}
        isDirty={form.formState.isDirty}
        steps={[
          {
            title: ts("steps.content"),
            fields: ["question", "answer", "faq_category_id"],
            content: (
              <>
                <Field data-invalid={!!errors.question || undefined}>
                  <FieldLabel htmlFor="faq-question">{t("question")}</FieldLabel>
                  <Input
                    id="faq-question"
                    placeholder={t("questionPlaceholder")}
                    autoComplete="off"
                    aria-invalid={!!errors.question}
                    {...form.register("question")}
                  />
                  {errors.question && <FieldError>{errors.question.message}</FieldError>}
                </Field>

                <Field data-invalid={!!errors.answer || undefined}>
                  <FieldLabel htmlFor="faq-answer">{t("answer")}</FieldLabel>
                  <Textarea
                    id="faq-answer"
                    className="min-h-40"
                    placeholder={t("answerPlaceholder")}
                    aria-invalid={!!errors.answer}
                    {...form.register("answer")}
                  />
                  <p className="text-end text-sm text-muted-foreground">
                    {ts("charCount", {
                      length: answerLength.toLocaleString(displayLocale()),
                      max: (5000).toLocaleString(displayLocale()),
                    })}
                  </p>
                  {errors.answer && <FieldError>{errors.answer.message}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="faq-category">{t("category")}</FieldLabel>
                  <Controller
                    control={form.control}
                    name="faq_category_id"
                    render={({ field }) => (
                      <Select
                        items={categoryItems}
                        value={field.value || "none"}
                        onValueChange={(value) =>
                          field.onChange(
                            value === "none" || value === null ? "" : (value as string)
                          )
                        }
                      >
                        <SelectTrigger id="faq-category" className="w-full">
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
              </>
            ),
          },
          {
            title: ts("steps.agents"),
            fields: ["agent_scope", "agent_ids"],
            content: <AgentScopeField idPrefix="faq" />,
          },
        ]}
      />
    </FormProvider>
  );
}
