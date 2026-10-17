"use client";

import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AgentScopeField } from "@/components/business-profile/agent-scope-field";
import { DurationEditor } from "@/components/business-profile/duration-editor";
import { EntityModal } from "@/components/business-profile/entity-modal";
import { FaqAttachmentField } from "@/components/business-profile/faq-attachment-field";
import { PriceEditor } from "@/components/business-profile/price-editor";
import { useBusiness } from "@/components/business/business-provider";
import { useCreateFaq } from "@/hooks/use-faqs";
import { useCreateService, useUpdateService } from "@/hooks/use-services";
import type { ApiError } from "@/lib/api/errors";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { PRICE_TYPES, type Service, type ServicePayload } from "@/lib/api/types";
import {
  serviceSchema,
  toServicePayload,
  toServiceValues,
  type ServiceValues,
} from "@/lib/validation/service";

/**
 * Create/edit service modal. With onSubmitOverride the validated payload
 * is handed back instead of POSTed — extraction draft review reuses the
 * exact same form that way.
 */
export function ServiceModal({
  open,
  onOpenChange,
  source,
  onSubmitOverride,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: Service | ServicePayload | null;
  onSubmitOverride?: (payload: ServicePayload) => void;
}) {
  const { business } = useBusiness();
  const create = useCreateService(business.id);
  const update = useUpdateService(business.id);
  const createFaq = useCreateFaq(business.id);

  const editing = Boolean(source && "id" in source);
  const title = onSubmitOverride ? "Review draft" : editing ? "Edit service" : "Add service";
  const submitLabel = onSubmitOverride ? "Apply" : editing ? "Save changes" : "Add service";

  const form = useForm<ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: toServiceValues(source),
  });
  const { errors } = form.formState;
  const descriptionLength = form.watch("description").length;

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = toServicePayload(values);
    if (onSubmitOverride) {
      onSubmitOverride(payload);
      onOpenChange(false);
      return;
    }
    if (source && "id" in source) {
      update.mutate(
        { id: (source as Service).id, payload },
        {
          onSuccess: () => {
            toast.success("Service saved");
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
            service_id: created.id,
          });
        } catch (error) {
          toast.error(
            `Couldn't add FAQ "${row.question.slice(0, 40)}": ${(error as ApiError).message}`
          );
        }
      }
      toast.success("Service added");
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
                  <FieldLabel htmlFor="service-name">Name</FieldLabel>
                  <Input
                    id="service-name"
                    placeholder="Gutter cleaning"
                    autoComplete="off"
                    aria-invalid={!!errors.name}
                    {...form.register("name")}
                  />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>

                <Field data-invalid={!!errors.description || undefined}>
                  <FieldLabel htmlFor="service-description">Description</FieldLabel>
                  <Textarea
                    id="service-description"
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
                        id="service-available"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel htmlFor="service-available" className="font-normal">
                      Available
                    </FieldLabel>
                    <p className="text-sm text-muted-foreground">
                      Unavailable services stay listed here but your AI won&apos;t offer
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
              "has_duration",
              "duration_unit",
              "duration_quantity",
            ],
            content: (
              <>
                <PriceEditor priceTypes={PRICE_TYPES} />
                <Separator />
                <DurationEditor />
              </>
            ),
          },
          {
            title: "FAQs",
            fields: ["faq_mode", "faq_ids"],
            content: (
              <FaqAttachmentField
                idPrefix="service"
                owner={
                  source && "id" in source && !onSubmitOverride
                    ? { type: "service", id: (source as Service).id }
                    : undefined
                }
                allowPendingOwn={!source && !onSubmitOverride}
              />
            ),
          },
          {
            title: "Agents",
            fields: ["agent_scope", "agent_ids"],
            content: <AgentScopeField idPrefix="service" />,
          },
        ]}
      />
    </FormProvider>
  );
}
