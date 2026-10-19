"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheckIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { PublicOnly } from "@/components/auth/guards";
import { useForgotPassword } from "@/hooks/use-auth-mutations";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();
  const [sent, setSent] = useState(false);

  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const schema = useMemo(() => forgotPasswordSchema(tv), [tv]);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    forgotPassword.mutate(values, {
      onSuccess: () => setSent(true),
      onError: (error) => applyServerErrors(form, error),
    });
  });

  return (
    <PublicOnly>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{t("forgotPassword.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("forgotPassword.subtitle")}</p>
        </div>

        {sent ? (
          <Alert>
            <MailCheckIcon />
            <AlertTitle>{t("forgotPassword.sentAlert.title")}</AlertTitle>
            <AlertDescription>{t("forgotPassword.sentAlert.description")}</AlertDescription>
          </Alert>
        ) : (
          <>
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

                <Button type="submit" disabled={forgotPassword.isPending}>
                  {forgotPassword.isPending && <Spinner />}
                  {t("forgotPassword.submit")}
                </Button>
              </FieldGroup>
            </form>
          </>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {t.rich("forgotPassword.remembered", {
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
