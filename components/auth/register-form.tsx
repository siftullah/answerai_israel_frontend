"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/ui/spinner";
import { PublicOnly } from "@/components/auth/guards";
import { useRegister } from "@/hooks/use-auth-mutations";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { registerSchema, type RegisterValues } from "@/lib/validation/auth";

export function RegisterForm() {
  const router = useRouter();
  const register = useRegister();
  const locale = useLocale();

  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const schema = useMemo(() => registerSchema(tv), [tv]);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      business_name: "",
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    // The language they signed up in becomes the account's: the verification
    // email, and everything after it, is written in it.
    register.mutate({ ...values, locale }, {
      // Backend auto-logs the user in (unverified) — straight to the gate.
      onSuccess: () => router.replace("/verify-email"),
      onError: (error) => applyServerErrors(form, error),
    });
  });

  return (
    <PublicOnly>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{t("register.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("register.subtitle")}</p>
        </div>

        {errors.root?.server && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.server.message}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={onSubmit} noValidate>
          <FieldGroup className="gap-4">
            <Field data-invalid={!!errors.business_name || undefined}>
              <FieldLabel htmlFor="business_name">{t("fields.businessName")}</FieldLabel>
              <Input
                id="business_name"
                autoComplete="organization"
                aria-invalid={!!errors.business_name}
                {...form.register("business_name")}
              />
              {errors.business_name && <FieldError>{errors.business_name.message}</FieldError>}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.first_name || undefined}>
                <FieldLabel htmlFor="first_name">{t("fields.firstName")}</FieldLabel>
                <Input
                  id="first_name"
                  autoComplete="given-name"
                  aria-invalid={!!errors.first_name}
                  {...form.register("first_name")}
                />
                {errors.first_name && <FieldError>{errors.first_name.message}</FieldError>}
              </Field>

              <Field data-invalid={!!errors.last_name || undefined}>
                <FieldLabel htmlFor="last_name">{t("fields.lastName")}</FieldLabel>
                <Input
                  id="last_name"
                  autoComplete="family-name"
                  aria-invalid={!!errors.last_name}
                  {...form.register("last_name")}
                />
                {errors.last_name && <FieldError>{errors.last_name.message}</FieldError>}
              </Field>
            </div>

            <Field data-invalid={!!errors.email || undefined}>
              <FieldLabel htmlFor="email">{tc("labels.email")}</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...form.register("email")}
              />
              {errors.email && <FieldError>{errors.email.message}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.password || undefined}>
              <FieldLabel htmlFor="password">{t("fields.password")}</FieldLabel>
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

            <Button type="submit" disabled={register.isPending}>
              {register.isPending && <Spinner />}
              {t("register.submit")}
            </Button>
          </FieldGroup>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t.rich("register.haveAccount", {
            link: (chunks) => (
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </PublicOnly>
  );
}
