"use client";

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

  const form = useForm<EditCallbackValues>({
    resolver: zodResolver(editCallbackSchema),
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
          toast.success("Callback updated");
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
          <DialogTitle>Edit callback</DialogTitle>
          <DialogDescription>
            Update the topic, notes or who handles the callback.
          </DialogDescription>
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
                      callback.type === "agent" ? "Choose an outbound agent" : "Choose a team member",
                  },
                  ...reassignOptions,
                ];
                return (
                  <Field data-invalid={!!fieldState.error || undefined}>
                    <FieldLabel htmlFor="edit-callback-reassign">
                      {callback.type === "agent" ? "Agent" : "Assignee"}
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
              <FieldLabel htmlFor="edit-callback-topic">Topic</FieldLabel>
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
              <FieldLabel htmlFor="edit-callback-notes">Notes</FieldLabel>
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
                Cancel
              </Button>
              <Button type="submit" disabled={updateCallback.isPending}>
                {updateCallback.isPending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
