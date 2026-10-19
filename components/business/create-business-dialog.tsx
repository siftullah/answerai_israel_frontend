"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useCreateBusiness } from "@/hooks/use-businesses";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { setLastUsedBusiness } from "@/lib/business/last-used";
import { createBusinessSchema, type CreateBusinessValues } from "@/lib/validation/auth";

export function CreateBusinessDialog({ trigger }: { trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const createBusiness = useCreateBusiness();
  const t = useTranslations("business");

  const tv = useTranslations("validation");
  const schema = useMemo(() => createBusinessSchema(tv), [tv]);
  const form = useForm<CreateBusinessValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    createBusiness.mutate(values, {
      onSuccess: (business) => {
        setLastUsedBusiness(business.id);
        router.push(`/b/${business.id}`);
      },
      onError: (error) => applyServerErrors(form, error),
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
          <DialogDescription>{t("createDialog.description")}</DialogDescription>
        </DialogHeader>

        {errors.root?.server && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.server.message}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={onSubmit} noValidate>
          <FieldGroup className="gap-4">
            <Field data-invalid={!!errors.name || undefined}>
              <FieldLabel htmlFor="business-name">{t("createDialog.nameLabel")}</FieldLabel>
              <Input
                id="business-name"
                autoComplete="organization"
                aria-invalid={!!errors.name}
                {...form.register("name")}
              />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>

            <Button type="submit" disabled={createBusiness.isPending}>
              {createBusiness.isPending && <Spinner />}
              {t("createDialog.submit")}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
