"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useUpdateProfile } from "@/hooks/use-profile";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import type { Membership, User } from "@/lib/api/types";
import {
  profileSchema,
  toProfilePayload,
  toProfileValues,
  type ProfileValues,
} from "@/lib/validation/profile";

export function ProfileDetailsForm({
  user,
  membership,
}: {
  user: User;
  membership: Membership;
}) {
  const update = useUpdateProfile();

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toProfileValues(user, membership),
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    const emailChanged = !!form.formState.dirtyFields.email;
    const payload = toProfilePayload(values, form.formState.dirtyFields, window.location.href);
    if (Object.keys(payload).length === 0) return;

    update.mutate(payload, {
      onSuccess: (updated) => {
        // Reset from the server echo: on an email change the live email is
        // unchanged (it's pending), so the field snaps back to the old address.
        form.reset(toProfileValues(updated.user, updated.membership ?? membership));
        toast.success(
          emailChanged
            ? `Confirm your new email — we sent a link to ${values.email.trim()}.`
            : "Profile saved"
        );
      },
      onError: (error) => applyServerErrors(form, error),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-[#30aece]">Your details</CardTitle>
          <CardDescription>Your name, email and contact details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {errors.root?.server && (
            <Alert variant="destructive" className="sm:col-span-2">
              <AlertDescription>{errors.root.server.message}</AlertDescription>
            </Alert>
          )}

          <Field data-invalid={!!errors.first_name || undefined}>
            <FieldLabel htmlFor="first_name">First name</FieldLabel>
            <Input
              id="first_name"
              autoComplete="off"
              aria-invalid={!!errors.first_name}
              {...form.register("first_name")}
            />
            {errors.first_name && <FieldError>{errors.first_name.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.last_name || undefined}>
            <FieldLabel htmlFor="last_name">Last name</FieldLabel>
            <Input
              id="last_name"
              autoComplete="off"
              aria-invalid={!!errors.last_name}
              {...form.register("last_name")}
            />
            {errors.last_name && <FieldError>{errors.last_name.message}</FieldError>}
          </Field>

          <Field className="sm:col-span-2" data-invalid={!!errors.email || undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="off"
              aria-invalid={!!errors.email}
              {...form.register("email")}
            />
            {user.pending_email ? (
              <p className="text-sm text-muted-foreground">
                Pending confirmation:{" "}
                <span className="font-medium text-foreground">{user.pending_email}</span> — check
                that inbox to finish the change.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Changing this sends a confirmation link to the new address; your current email
                stays active until you confirm.
              </p>
            )}
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.phone_e164 || undefined}>
            <FieldLabel htmlFor="phone_e164">Phone</FieldLabel>
            <Input
              id="phone_e164"
              type="tel"
              placeholder="0412 345 678"
              autoComplete="off"
              aria-invalid={!!errors.phone_e164}
              {...form.register("phone_e164")}
            />
            {errors.phone_e164 && <FieldError>{errors.phone_e164.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.position || undefined}>
            <FieldLabel htmlFor="position">Position</FieldLabel>
            <Input
              id="position"
              placeholder="e.g. Practice Manager"
              autoComplete="off"
              aria-invalid={!!errors.position}
              {...form.register("position")}
            />
            {errors.position && <FieldError>{errors.position.message}</FieldError>}
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        {isDirty && (
          <Button type="button" variant="ghost" onClick={() => form.reset()}>
            Discard changes
          </Button>
        )}
        <Button type="submit" disabled={!isDirty || update.isPending}>
          {update.isPending && <Spinner />}
          Save changes
        </Button>
      </div>
    </form>
  );
}
