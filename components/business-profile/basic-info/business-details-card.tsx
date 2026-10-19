"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";
import { TimezoneCombobox } from "@/components/business-profile/basic-info/timezone-combobox";
import { WeeklyHoursEditor } from "@/components/business-profile/weekly-hours-editor";
import { useBusiness } from "@/components/business/business-provider";
import { useUpdateBusiness } from "@/hooks/use-businesses";
import { useBusinessHours, useReplaceBusinessHours } from "@/hooks/use-business-hours";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import type { ApiError } from "@/lib/api/errors";
import type { Business, BusinessHourRow } from "@/lib/api/types";
import { toApiHourRows } from "@/lib/validation/weekly-hours";
import {
  businessDetailsSchema,
  businessDetailsServerFieldKey,
  toBusinessDetailsValues,
  type BusinessDetailsValues,
} from "@/lib/validation/business";

/** Fetch gate — the form mounts only once the trading hours are known. */
export function BusinessDetailsCard() {
  const t = useTranslations("businessProfile.businessDetails");
  const { business } = useBusiness();
  const hoursQuery = useBusinessHours(business.id);

  if (hoursQuery.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (hoursQuery.isError) {
    return (
      <ErrorState
        title={t("loadError")}
        message={hoursQuery.error.message}
        onRetry={() => hoursQuery.refetch()}
      />
    );
  }

  return <BusinessDetailsForm business={business} hours={hoursQuery.data} />;
}

function BusinessDetailsForm({
  business,
  hours,
}: {
  business: Business;
  hours: BusinessHourRow[];
}) {
  const t = useTranslations("businessProfile.businessDetails");
  const ts = useTranslations("businessProfile.shared");
  const tc = useTranslations("common");
  const updateBusiness = useUpdateBusiness(business.id);
  const replaceHours = useReplaceBusinessHours(business.id);

  const tv = useTranslations("validation");
  const schema = useMemo(() => businessDetailsSchema(tv), [tv]);
  const form = useForm<BusinessDetailsValues>({
    resolver: zodResolver(schema),
    defaultValues: toBusinessDetailsValues(business, hours),
  });
  const { errors, isDirty } = form.formState;
  const saving = updateBusiness.isPending || replaceHours.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    const dirty = form.formState.dirtyFields;
    let nextBusiness = business;
    let nextHours = hours;

    try {
      if (dirty.name || dirty.timezone) {
        nextBusiness = await updateBusiness.mutateAsync({
          ...(dirty.name ? { name: values.name.trim() } : {}),
          ...(dirty.timezone ? { timezone: values.timezone } : {}),
        });
      }

      if (dirty.trading_hours) {
        nextHours = await replaceHours.mutateAsync({
          days: toApiHourRows(values.trading_hours),
        });
      }

      form.reset(toBusinessDetailsValues(nextBusiness, nextHours));
      toast.success(t("toasts.saved"));
    } catch (error) {
      // Partial failure keeps the form dirty; re-saving the already-saved
      // part is an idempotent PATCH/PUT, so a retry is harmless.
      applyServerErrors(form, error as ApiError, { mapKey: businessDetailsServerFieldKey });
    }
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.name || undefined}>
              <FieldLabel htmlFor="business-name">{t("name")}</FieldLabel>
              <Input
                id="business-name"
                placeholder={t("namePlaceholder")}
                autoComplete="off"
                aria-invalid={!!errors.name}
                {...form.register("name")}
              />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.timezone || undefined}>
              <FieldLabel htmlFor="business-timezone">{t("timezone")}</FieldLabel>
              <Controller
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <TimezoneCombobox
                    id="business-timezone"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={!!errors.timezone}
                  />
                )}
              />
              <p className="text-sm text-muted-foreground">
                {t("timezoneHint")}
              </p>
              {errors.timezone && <FieldError>{errors.timezone.message}</FieldError>}
            </Field>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <p className="text-base font-medium">{t("tradingHours")}</p>
              <p className="text-sm text-muted-foreground">
                {t("tradingHoursHint")}
              </p>
            </div>
            <Controller
              control={form.control}
              name="trading_hours"
              render={({ field }) => (
                <WeeklyHoursEditor value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.trading_hours && (
              <FieldError>{errors.trading_hours.message as string}</FieldError>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            {isDirty && (
              <Button type="button" variant="ghost" onClick={() => form.reset()}>
                {ts("discardChanges")}
              </Button>
            )}
            <Button type="submit" disabled={!isDirty || saving}>
              {saving && <Spinner />}
              {tc("actions.saveChanges")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
