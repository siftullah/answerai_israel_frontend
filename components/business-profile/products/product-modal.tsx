"use client";

import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AgentScopeField } from "@/components/business-profile/agent-scope-field";
import { EntityModal } from "@/components/business-profile/entity-modal";
import { FaqAttachmentField } from "@/components/business-profile/faq-attachment-field";
import { PriceEditor } from "@/components/business-profile/price-editor";
import { useBusiness } from "@/components/business/business-provider";
import { useCreateFaq } from "@/hooks/use-faqs";
import { useCreateProduct, useUpdateProduct } from "@/hooks/use-products";
import type { ApiError } from "@/lib/api/errors";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { PRODUCT_PRICE_TYPES, type Product, type ProductPayload } from "@/lib/api/types";
import {
  productSchema,
  toProductPayload,
  toProductValues,
  type ProductValues,
} from "@/lib/validation/product";

/**
 * Create/edit product modal. With onSubmitOverride the validated payload
 * is handed back instead of POSTed (extraction draft review).
 */
export function ProductModal({
  open,
  onOpenChange,
  source,
  onSubmitOverride,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: Product | ProductPayload | null;
  onSubmitOverride?: (payload: ProductPayload) => void;
}) {
  const { business } = useBusiness();
  const create = useCreateProduct(business.id);
  const update = useUpdateProduct(business.id);
  const createFaq = useCreateFaq(business.id);

  const editing = Boolean(source && "id" in source);
  const title = onSubmitOverride ? "Review draft" : editing ? "Edit product" : "Add product";
  const submitLabel = onSubmitOverride ? "Apply" : editing ? "Save changes" : "Add product";

  const form = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: toProductValues(source),
  });
  const { errors } = form.formState;
  const descriptionLength = form.watch("description").length;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = toProductPayload(values);
    if (onSubmitOverride) {
      onSubmitOverride(payload);
      onOpenChange(false);
      return;
    }
    if (source && "id" in source) {
      update.mutate(
        { id: (source as Product).id, payload },
        {
          onSuccess: () => {
            toast.success("Product saved");
            onOpenChange(false);
          },
          onError: (error) => applyServerErrors(form, error),
        }
      );
      return;
    }
    try {
      const created = await create.mutateAsync(payload);
      // Own FAQs composed during create ride along in form state and are
      // attached one by one now that the owner exists.
      for (const row of values.pending_own_faqs) {
        try {
          await createFaq.mutateAsync({
            question: row.question,
            answer: row.answer,
            product_id: created.id,
          });
        } catch (error) {
          toast.error(
            `Couldn't add FAQ "${row.question.slice(0, 40)}": ${(error as ApiError).message}`
          );
        }
      }
      toast.success("Product added");
      onOpenChange(false);
    } catch (error) {
      applyServerErrors(form, error as ApiError);
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
        pending={form.formState.isSubmitting || update.isPending}
        isDirty={form.formState.isDirty}
        steps={[
          {
            title: "Details",
            fields: ["name", "description", "available"],
            content: (
              <>
                <Field data-invalid={!!errors.name || undefined}>
                  <FieldLabel htmlFor="product-name">Name</FieldLabel>
                  <Input
                    id="product-name"
                    placeholder="Colorbond gutter guard"
                    autoComplete="off"
                    aria-invalid={!!errors.name}
                    {...form.register("name")}
                  />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>

                <Field data-invalid={!!errors.description || undefined}>
                  <FieldLabel htmlFor="product-description">Description</FieldLabel>
                  <Textarea
                    id="product-description"
                    className="min-h-32"
                    placeholder="What's included, who it's for, what makes it different…"
                    aria-invalid={!!errors.description}
                    {...form.register("description")}
                  />
                  <p className="text-right text-sm text-muted-foreground">
                    {descriptionLength.toLocaleString()} / 2,000
                  </p>
                  {errors.description && (
                    <FieldError>{errors.description.message}</FieldError>
                  )}
                </Field>

                <Field orientation="horizontal">
                  <Controller
                    control={form.control}
                    name="available"
                    render={({ field }) => (
                      <Switch
                        id="product-available"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel htmlFor="product-available" className="font-normal">
                      Available
                    </FieldLabel>
                    <p className="text-sm text-muted-foreground">
                      Unavailable products stay listed here but your AI won&apos;t offer
                      them.
                    </p>
                  </div>
                </Field>
              </>
            ),
          },
          {
            title: "Pricing",
            fields: [
              "has_price",
              "ai_can_quote_price",
              "price_type",
              "price_cents",
              "price_min_cents",
              "price_max_cents",
              "price_message",
            ],
            content: <PriceEditor priceTypes={PRODUCT_PRICE_TYPES} />,
          },
          {
            title: "FAQs",
            fields: ["faq_mode", "faq_ids"],
            content: (
              <FaqAttachmentField
                idPrefix="product"
                owner={
                  source && "id" in source && !onSubmitOverride
                    ? { type: "product", id: (source as Product).id }
                    : undefined
                }
                allowPendingOwn={!source && !onSubmitOverride}
              />
            ),
          },
          {
            title: "Agents",
            fields: ["agent_scope", "agent_ids"],
            content: <AgentScopeField idPrefix="product" />,
          },
        ]}
      />
    </FormProvider>
  );
}
