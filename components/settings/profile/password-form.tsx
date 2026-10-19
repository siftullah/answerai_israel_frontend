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
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/ui/spinner";
import { useUpdatePassword } from "@/hooks/use-profile";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import {
  passwordSchema,
  toPasswordPayload,
  type PasswordValues,
} from "@/lib/validation/password";

const EMPTY: PasswordValues = {
  current_password: "",
  password: "",
  password_confirmation: "",
};

export function PasswordForm() {
  const t = useTranslations("settings.profile.password");
  const tc = useTranslations("common");
  const update = useUpdatePassword();

  const tv = useTranslations("validation");
  const schema = useMemo(() => passwordSchema(tv), [tv]);
  const form = useForm<PasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(toPasswordPayload(values), {
      onSuccess: () => {
        form.reset(EMPTY);
        toast.success(t("toasts.updated"));
      },
      onError: (error) => applyServerErrors(form, error),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-[#30aece]">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {errors.root?.server && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.server.message}</AlertDescription>
            </Alert>
          )}

          <Field data-invalid={!!errors.current_password || undefined}>
            <FieldLabel htmlFor="current_password">{t("current")}</FieldLabel>
            <PasswordInput
              id="current_password"
              autoComplete="current-password"
              aria-invalid={!!errors.current_password}
              {...form.register("current_password")}
            />
            {errors.current_password && (
              <FieldError>{errors.current_password.message}</FieldError>
            )}
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={!!errors.password || undefined}>
              <FieldLabel htmlFor="password">{t("new")}</FieldLabel>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...form.register("password")}
              />
              {errors.password && <FieldError>{errors.password.message}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.password_confirmation || undefined}>
              <FieldLabel htmlFor="password_confirmation">{t("confirm")}</FieldLabel>
              <PasswordInput
                id="password_confirmation"
                autoComplete="new-password"
                aria-invalid={!!errors.password_confirmation}
                {...form.register("password_confirmation")}
              />
              {errors.password_confirmation && (
                <FieldError>{errors.password_confirmation.message}</FieldError>
              )}
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2">
            {isDirty && (
              <Button type="button" variant="ghost" onClick={() => form.reset(EMPTY)}>
                {tc("actions.discard")}
              </Button>
            )}
            <Button type="submit" disabled={!isDirty || update.isPending}>
              {update.isPending && <Spinner />}
              {t("update")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
