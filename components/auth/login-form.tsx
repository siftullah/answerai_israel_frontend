"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheckIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/ui/spinner";
import { PublicOnly } from "@/components/auth/guards";
import { useLogin } from "@/hooks/use-auth-mutations";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { loginSchema, type LoginValues } from "@/lib/validation/auth";

/** Only allow internal paths as post-login destinations. */
function safeReturnPath(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();

  const justVerified = searchParams.get("verified") === "1";
  const justReset = searchParams.get("reset") === "1";
  const returnTo = safeReturnPath(searchParams.get("return"));

  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const schema = useMemo(() => loginSchema(tv), [tv]);
  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: false },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => router.replace(returnTo),
      onError: (error) => applyServerErrors(form, error),
    });
  });

  return (
    <PublicOnly>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{t("login.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </div>

        {justVerified && (
          <Alert>
            <CircleCheckIcon />
            <AlertTitle>{t("login.verifiedAlert.title")}</AlertTitle>
            <AlertDescription>{t("login.verifiedAlert.description")}</AlertDescription>
          </Alert>
        )}

        {justReset && (
          <Alert>
            <CircleCheckIcon />
            <AlertTitle>{t("login.resetAlert.title")}</AlertTitle>
            <AlertDescription>{t("login.resetAlert.description")}</AlertDescription>
          </Alert>
        )}

        {errors.root?.server && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.server.message}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={onSubmit} noValidate>
          <FieldGroup className="gap-4">
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
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">{t("fields.password")}</FieldLabel>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...form.register("password")}
              />
              {errors.password && <FieldError>{errors.password.message}</FieldError>}
            </Field>

            <Field orientation="horizontal">
              <Controller
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <Checkbox
                    id="remember"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                )}
              />
              <FieldLabel htmlFor="remember" className="font-normal">
                {t("login.rememberMe")}
              </FieldLabel>
            </Field>

            <Button type="submit" disabled={login.isPending}>
              {login.isPending && <Spinner />}
              {t("login.submit")}
            </Button>
          </FieldGroup>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t.rich("login.noAccount", {
            link: (chunks) => (
              <Link href="/register" className="text-primary underline-offset-4 hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </PublicOnly>
  );
}
