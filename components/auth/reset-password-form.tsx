"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/ui/spinner";
import { PublicOnly } from "@/components/auth/guards";
import { useResetPassword } from "@/hooks/use-auth-mutations";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validation/auth";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetPassword = useResetPassword();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const schema = useMemo(() => resetPasswordSchema(tv), [tv]);
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" },
  });
  const { errors } = form.formState;

  if (!token || !email) {
    return (
      <PublicOnly>
        <div className="flex flex-col gap-5">
          <Alert variant="destructive">
            <AlertTitle>{t("resetPassword.invalidLink.title")}</AlertTitle>
            <AlertDescription>{t("resetPassword.invalidLink.description")}</AlertDescription>
          </Alert>
          <Button render={<Link href="/forgot-password" />}>
            {t("resetPassword.invalidLink.requestNew")}
          </Button>
        </div>
      </PublicOnly>
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    resetPassword.mutate(
      { token, email, password: values.password },
      {
        onSuccess: () => router.replace("/login?reset=1"),
        // Bad/expired tokens come back as a 422 on `email` — not a form
        // field here, so it surfaces in the root.server alert.
        onError: (error) => applyServerErrors(form, error),
      }
    );
  });

  return (
    <PublicOnly>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{t("resetPassword.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("resetPassword.subtitle")}</p>
        </div>

        {errors.root?.server && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.server.message}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={onSubmit} noValidate>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="reset-email">{tc("labels.email")}</FieldLabel>
              <Input id="reset-email" type="email" value={email} disabled readOnly />
            </Field>

            <Field data-invalid={!!errors.password || undefined}>
              <FieldLabel htmlFor="password">{t("resetPassword.newPassword")}</FieldLabel>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...form.register("password")}
              />
              {errors.password ? (
                <FieldError>{errors.password.message}</FieldError>
              ) : (
                <FieldDescription>{t("fields.passwordHint")}</FieldDescription>
              )}
            </Field>

            <Button type="submit" disabled={resetPassword.isPending}>
              {resetPassword.isPending && <Spinner />}
              {t("resetPassword.submit")}
            </Button>
          </FieldGroup>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            {t("resetPassword.backToLogin")}
          </Link>
        </p>
      </div>
    </PublicOnly>
  );
}
