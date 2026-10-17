"use client";

import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AgentScopeField } from "@/components/business-profile/agent-scope-field";
import { EntityModal } from "@/components/business-profile/entity-modal";
import { useBusiness } from "@/components/business/business-provider";
import {
  useCreateBusinessPolicy,
  useUpdateBusinessPolicy,
} from "@/hooks/use-business-policies";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import type { BusinessPolicy, BusinessPolicyPayload } from "@/lib/api/types";
import {
  policySchema,
  toPolicyPayload,
  toPolicyValues,
  type PolicyValues,
} from "@/lib/validation/policy";

export function PolicyModal({
  open,
  onOpenChange,
  source,
  onSubmitOverride,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: BusinessPolicy | BusinessPolicyPayload | null;
  onSubmitOverride?: (payload: BusinessPolicyPayload) => void;
}) {
  const { business } = useBusiness();
  const create = useCreateBusinessPolicy(business.id);
  const update = useUpdateBusinessPolicy(business.id);

  const editing = Boolean(source && "id" in source);
  const title = onSubmitOverride ? "Review draft" : editing ? "Edit policy" : "Add policy";
  const submitLabel = onSubmitOverride ? "Apply" : editing ? "Save changes" : "Add policy";

  const form = useForm<PolicyValues>({
    resolver: zodResolver(policySchema),
    defaultValues: toPolicyValues(source),
  });
  const { errors } = form.formState;
  const contentLength = form.watch("content").length;

  const onSubmit = form.handleSubmit((values) => {
    const payload = toPolicyPayload(values);
    if (onSubmitOverride) {
      onSubmitOverride(payload);
      onOpenChange(false);
      return;
    }
    if (source && "id" in source) {
      update.mutate(
        { id: (source as BusinessPolicy).id, payload },
        {
          onSuccess: () => {
            toast.success("Policy saved");
            onOpenChange(false);
          },
          onError: (error) => applyServerErrors(form, error),
        }
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success("Policy added");
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
            title: "Content",
            fields: ["name", "content"],
            content: (
              <>
                <Field data-invalid={!!errors.name || undefined}>
                  <FieldLabel htmlFor="policy-name">Name</FieldLabel>
                  <Input
                    id="policy-name"
                    placeholder="Cancellation policy"
                    autoComplete="off"
                    aria-invalid={!!errors.name}
                    {...form.register("name")}
                  />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>

                <Field data-invalid={!!errors.content || undefined}>
                  <FieldLabel htmlFor="policy-content">Content</FieldLabel>
                  <Textarea
                    id="policy-content"
                    className="min-h-72"
                    placeholder="Bookings can be cancelled up to 24 hours ahead for a full refund…"
                    aria-invalid={!!errors.content}
                    {...form.register("content")}
                  />
                  <p className="text-right text-sm text-muted-foreground">
                    {contentLength.toLocaleString()} / 10,000
                  </p>
                  {errors.content && <FieldError>{errors.content.message}</FieldError>}
                </Field>
              </>
            ),
          },
          {
            title: "Agents",
            fields: ["agent_scope", "agent_ids"],
            content: <AgentScopeField idPrefix="policy" />,
          },
        ]}
      />
    </FormProvider>
  );
}
