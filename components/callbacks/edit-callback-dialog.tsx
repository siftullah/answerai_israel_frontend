"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Controller, FormProvider, useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { useAgents } from "@/hooks/use-agents";
import { useMembers } from "@/hooks/use-members";
import { useUpdateCallback } from "@/hooks/use-callbacks";
import {
  applyCallbackServerErrors,
  editCallbackSchema,
  toUpdateCallbackPayload,
  type EditCallbackValues,
} from "@/lib/validation/callback";
import { eligibleAgents } from "@/lib/validation/phone-number";
import type { Callback } from "@/lib/api/types";

export function EditCallbackDialog({
  open,
  onOpenChange,
  businessUuid,
  callback,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessUuid: string;
  callback: Callback;
}) {
  const agentsQuery = useAgents(businessUuid);
  const membersQuery = useMembers(businessUuid);
  const updateCallback = useUpdateCallback(businessUuid);

  const t = useTranslations("callbacks");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const schema = useMemo(() => editCallbackSchema(tv), [tv]);
  const form = useForm<EditCallbackValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      topic: callback.topic ?? "",
      notes: callback.notes ?? "",
      assignee_user_id: callback.assignee?.id ?? "",
      agent_id: callback.agent?.id ?? "",
    },
  });
  const rootServerError = (
    form.formState.errors.root as Record<string, { message?: string }> | undefined
  )?.server;

  const reassignName = callback.type === "agent" ? "agent_id" : "assignee_user_id";
  const reassignOptions =
    callback.type === "agent"
      ? eligibleAgents(agentsQuery.data, "outbound").map((agent) => ({
          value: agent.id,
          label: agent.name,
        }))
      : (membersQuery.data ?? [])
          .filter((member) => member.has_account && member.user)
          .map((member) => ({ value: member.user?.id ?? "", label: member.name }));

  const onSubmit = form.handleSubmit((values) => {
    updateCallback.mutate(
      { id: callback.id, payload: toUpdateCallbackPayload(values, callback.type) },
      {
        onSuccess: () => {
          toast.success(t("toasts.updated"));
          onOpenChange(false);
        },
        onError: (error) => applyCallbackServerErrors(form, error),
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editDialog.title")}</DialogTitle>
          <DialogDescription>{t("editDialog.description")}</DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Controller
              name={reassignName}
              control={form.control}
              render={({ field, fieldState }) => {
                const items = [
                  {
                    value: "",
                    label:
                      callback.type === "agent"
                        ? t("placeholders.agent")
                        : t("placeholders.assignee"),
                  },
                  ...reassignOptions,
                ];
                return (
                  <Field data-invalid={!!fieldState.error || undefined}>
                    <FieldLabel htmlFor="edit-callback-reassign">
                      {callback.type === "agent" ? t("labels.agent") : t("labels.assignee")}
                    </FieldLabel>
                    <Select
                      items={items}
                      value={field.value}
                      onValueChange={(value) => field.onChange((value as string | null) ?? "")}
                    >
                      <SelectTrigger
                        id="edit-callback-reassign"
                        className="w-full"
                        aria-invalid={!!fieldState.error}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {reassignOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error?.message && (
                      <FieldError>{fieldState.error.message}</FieldError>
                    )}
                  </Field>
                );
              }}
            />

            <Field data-invalid={!!form.formState.errors.topic || undefined}>
              <FieldLabel htmlFor="edit-callback-topic">{t("labels.topic")}</FieldLabel>
              <Input
                id="edit-callback-topic"
                {...form.register("topic")}
                aria-invalid={!!form.formState.errors.topic}
              />
              {form.formState.errors.topic?.message && (
                <FieldError>{form.formState.errors.topic.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!form.formState.errors.notes || undefined}>
              <FieldLabel htmlFor="edit-callback-notes">{tc("labels.notes")}</FieldLabel>
              <Textarea
                id="edit-callback-notes"
                {...form.register("notes")}
                rows={3}
                aria-invalid={!!form.formState.errors.notes}
              />
              {form.formState.errors.notes?.message && (
                <FieldError>{form.formState.errors.notes.message}</FieldError>
              )}
            </Field>

            {rootServerError?.message && (
              <Alert variant="destructive">
                <AlertDescription>{rootServerError.message}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tc("actions.cancel")}
              </Button>
              <Button type="submit" disabled={updateCallback.isPending}>
                {updateCallback.isPending ? tc("actions.saving") : tc("actions.saveChanges")}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
