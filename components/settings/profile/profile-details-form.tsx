"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("settings.profile.details");
  const tc = useTranslations("common");
  const update = useUpdateProfile();

  const tv = useTranslations("validation");
  const schema = useMemo(() => profileSchema(tv), [tv]);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(schema),
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
            ? t("toasts.emailPending", { email: values.email.trim() })
            : t("toasts.saved")
        );
      },
      onError: (error) => applyServerErrors(form, error),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-[#30aece]">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {errors.root?.server && (
            <Alert variant="destructive" className="sm:col-span-2">
              <AlertDescription>{errors.root.server.message}</AlertDescription>
            </Alert>
          )}

          <Field data-invalid={!!errors.first_name || undefined}>
            <FieldLabel htmlFor="first_name">{t("firstName")}</FieldLabel>
            <Input
              id="first_name"
              autoComplete="off"
              aria-invalid={!!errors.first_name}
              {...form.register("first_name")}
            />
            {errors.first_name && <FieldError>{errors.first_name.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.last_name || undefined}>
            <FieldLabel htmlFor="last_name">{t("lastName")}</FieldLabel>
            <Input
              id="last_name"
              autoComplete="off"
              aria-invalid={!!errors.last_name}
              {...form.register("last_name")}
            />
            {errors.last_name && <FieldError>{errors.last_name.message}</FieldError>}
          </Field>

          <Field className="sm:col-span-2" data-invalid={!!errors.email || undefined}>
            <FieldLabel htmlFor="email">{tc("labels.email")}</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="off"
              aria-invalid={!!errors.email}
              {...form.register("email")}
            />
            {user.pending_email ? (
              <p className="text-sm text-muted-foreground">
                {t.rich("pendingEmail", {
                  email: user.pending_email,
                  strong: (chunks) => (
                    <span className="font-medium text-foreground">{chunks}</span>
                  ),
                })}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("emailHint")}</p>
            )}
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.phone_e164 || undefined}>
            <FieldLabel htmlFor="phone_e164">{tc("labels.phone")}</FieldLabel>
            <Input
              id="phone_e164"
              type="tel"
              placeholder={t("phonePlaceholder")}
              autoComplete="off"
              aria-invalid={!!errors.phone_e164}
              {...form.register("phone_e164")}
            />
            {errors.phone_e164 && <FieldError>{errors.phone_e164.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.position || undefined}>
            <FieldLabel htmlFor="position">{t("position")}</FieldLabel>
            <Input
              id="position"
              placeholder={t("positionPlaceholder")}
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
            {t("discardChanges")}
          </Button>
        )}
        <Button type="submit" disabled={!isDirty || update.isPending}>
          {update.isPending && <Spinner />}
          {tc("actions.saveChanges")}
        </Button>
      </div>
    </form>
  );
}
