"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { AddressSearchField } from "@/components/business-profile/basic-info/address-search-field";
import { CategoriesField } from "@/components/business-profile/basic-info/categories-field";
import { useUpdateBusinessProfile } from "@/hooks/use-business-profile";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import type { BasicInfoDraft, BusinessProfile, SocialKey } from "@/lib/api/types";
import { SOCIAL_KEYS } from "@/lib/api/types";
import {
  businessProfileSchema,
  toBusinessProfileValues,
  toUpdatePayload,
  type BusinessProfileValues,
} from "@/lib/validation/business-profile";
import { formatE164 } from "@/lib/phone";

const COUNTRIES = [
  { value: "AU", label: "Australia" },
  { value: "NZ", label: "New Zealand" },
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
];

const CURRENCIES = [
  { value: "AUD", label: "AUD — Australian dollar" },
  { value: "NZD", label: "NZD — New Zealand dollar" },
  { value: "GBP", label: "GBP — British pound" },
  { value: "USD", label: "USD — US dollar" },
  { value: "EUR", label: "EUR — Euro" },
];

const SOCIAL_LABELS: Record<SocialKey, { label: string; placeholder: string }> = {
  facebook: { label: "Facebook", placeholder: "https://facebook.com/yourbusiness" },
  instagram: { label: "Instagram", placeholder: "https://instagram.com/yourbusiness" },
  linkedin: { label: "LinkedIn", placeholder: "https://linkedin.com/company/yourbusiness" },
  tiktok: { label: "TikTok", placeholder: "https://tiktok.com/@yourbusiness" },
  youtube: { label: "YouTube", placeholder: "https://youtube.com/@yourbusiness" },
  x: { label: "X", placeholder: "https://x.com/yourbusiness" },
};

export function ProfileForm({
  businessUuid,
  profile,
  draft,
  onDraftHandled,
}: {
  businessUuid: string;
  profile: BusinessProfile;
  /** Extraction draft to prefill into the form (never auto-saved). */
  draft: BasicInfoDraft | null;
  onDraftHandled: () => void;
}) {
  const update = useUpdateBusinessProfile(businessUuid);

  const form = useForm<BusinessProfileValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: toBusinessProfileValues(profile),
  });
  const { errors, isDirty } = form.formState;
  const locationType = form.watch("location_type");
  const descriptionLength = form.watch("description").length;

  // Prefill (not save) extracted values: only non-empty draft fields are
  // written, marked dirty so the diff is visible and the save is explicit.
  useEffect(() => {
    if (!draft) return;
    const set = (
      name: Parameters<typeof form.setValue>[0],
      value: Parameters<typeof form.setValue>[1]
    ) => form.setValue(name, value, { shouldDirty: true });

    if (draft.description) set("description", draft.description);
    if (draft.categories?.length) {
      set(
        "categories",
        draft.categories.slice(0, 10).map((category) => category.slice(0, 60))
      );
    }
    if (draft.public_email) set("public_email", draft.public_email);
    if (draft.public_phone) set("public_phone", formatE164(draft.public_phone));
    if (draft.website) set("website", draft.website);
    if (draft.year_founded) set("year_founded", String(draft.year_founded));
    if (draft.socials) {
      for (const key of SOCIAL_KEYS) {
        const url = draft.socials[key];
        if (url) set(`socials.${key}`, url);
      }
    }
    if (draft.location_type) set("location_type", draft.location_type);
    if (draft.address) {
      set("address", draft.address);
      set("latitude", null);
      set("longitude", null);
    }
    if (draft.base_location) set("base_location", draft.base_location);
    if (draft.travel_radius_km) set("travel_radius_km", String(draft.travel_radius_km));
  }, [draft, form]);

  const onSubmit = form.handleSubmit((values) => {
    const payload = toUpdatePayload(values, form.formState.dirtyFields);
    if (Object.keys(payload).length === 0) return;
    update.mutate(payload, {
      onSuccess: (updated) => {
        form.reset(toBusinessProfileValues(updated));
        if (draft) onDraftHandled();
        toast.success("Profile saved");
      },
      onError: (error) => applyServerErrors(form, error),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {draft && (
        <Alert>
          <SparklesIcon />
          <AlertTitle>Extracted details filled in</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            Review the highlighted values below, adjust anything that&apos;s off, then save.
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                form.reset();
                onDraftHandled();
              }}
            >
              Discard draft
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {errors.root?.server && (
        <Alert variant="destructive">
          <AlertDescription>{errors.root.server.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-[#30aece]">Contact details</CardTitle>
          <CardDescription>How customers — and your AI — can reach the business.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.public_email || undefined}>
            <FieldLabel htmlFor="public_email">Public email</FieldLabel>
            <Input
              id="public_email"
              type="email"
              placeholder="hello@yourbusiness.com.au"
              autoComplete="off"
              aria-invalid={!!errors.public_email}
              {...form.register("public_email")}
            />
            {errors.public_email && <FieldError>{errors.public_email.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.public_phone || undefined}>
            <FieldLabel htmlFor="public_phone">Public phone</FieldLabel>
            <Input
              id="public_phone"
              type="tel"
              placeholder="(02) 5550 1234"
              autoComplete="off"
              aria-invalid={!!errors.public_phone}
              {...form.register("public_phone")}
            />
            {errors.public_phone && <FieldError>{errors.public_phone.message}</FieldError>}
          </Field>

          <Field className="sm:col-span-2" data-invalid={!!errors.website || undefined}>
            <FieldLabel htmlFor="website">Website</FieldLabel>
            <Input
              id="website"
              type="url"
              placeholder="https://yourbusiness.com.au"
              autoComplete="off"
              aria-invalid={!!errors.website}
              {...form.register("website")}
            />
            {errors.website && <FieldError>{errors.website.message}</FieldError>}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#30aece]">About the business</CardTitle>
          <CardDescription>
            What your AI says when callers ask what the business does.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Field data-invalid={!!errors.description || undefined}>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              rows={5}
              placeholder="Tell callers what you do, who you serve, and what makes you the right choice…"
              aria-invalid={!!errors.description}
              {...form.register("description")}
            />
            <p className="text-right text-sm text-muted-foreground">
              {descriptionLength.toLocaleString()} / 5,000
            </p>
            {errors.description && <FieldError>{errors.description.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.categories || undefined}>
            <FieldLabel htmlFor="categories">Categories</FieldLabel>
            <Controller
              control={form.control}
              name="categories"
              render={({ field }) => (
                <CategoriesField
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!errors.categories}
                />
              )}
            />
            {errors.categories && <FieldError>{errors.categories.message}</FieldError>}
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field data-invalid={!!errors.year_founded || undefined}>
              <FieldLabel htmlFor="year_founded">Year founded</FieldLabel>
              <Input
                id="year_founded"
                inputMode="numeric"
                placeholder="2015"
                autoComplete="off"
                aria-invalid={!!errors.year_founded}
                {...form.register("year_founded")}
              />
              {errors.year_founded && <FieldError>{errors.year_founded.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="country">Country</FieldLabel>
              <Controller
                control={form.control}
                name="country"
                render={({ field }) => {
                  const countryItems =
                    COUNTRIES.some((c) => c.value === field.value) || !field.value
                      ? COUNTRIES
                      : [...COUNTRIES, { value: field.value, label: field.value }];
                  // Base UI's SelectValue renders the raw value unless the
                  // root knows the item labels.
                  return (
                    <Select
                      items={countryItems}
                      value={field.value || null}
                      onValueChange={(value) => field.onChange((value as string | null) ?? "")}
                    >
                      <SelectTrigger id="country" className="w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryItems.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="currency">Currency</FieldLabel>
              <Controller
                control={form.control}
                name="currency"
                render={({ field }) => {
                  const currencyItems =
                    CURRENCIES.some((c) => c.value === field.value) || !field.value
                      ? CURRENCIES
                      : [...CURRENCIES, { value: field.value, label: field.value }];
                  // Base UI's SelectValue renders the raw value unless the
                  // root knows the item labels.
                  return (
                    <Select
                      items={currencyItems}
                      value={field.value || null}
                      onValueChange={(value) => field.onChange((value as string | null) ?? "")}
                    >
                      <SelectTrigger id="currency" className="w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyItems.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#30aece]">Social profiles</CardTitle>
          <CardDescription>Linked profiles your AI can point callers to.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {SOCIAL_KEYS.map((key) => (
            <Field key={key} data-invalid={!!errors.socials?.[key] || undefined}>
              <FieldLabel htmlFor={`socials-${key}`}>{SOCIAL_LABELS[key].label}</FieldLabel>
              <Input
                id={`socials-${key}`}
                type="url"
                placeholder={SOCIAL_LABELS[key].placeholder}
                autoComplete="off"
                aria-invalid={!!errors.socials?.[key]}
                {...form.register(`socials.${key}`)}
              />
              {errors.socials?.[key] && (
                <FieldError>{errors.socials[key]?.message}</FieldError>
              )}
            </Field>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#30aece]">Location</CardTitle>
          <CardDescription>Where you operate — used for directions and travel questions.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Controller
            control={form.control}
            name="location_type"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(value) => field.onChange(value as string)}
                className="gap-3"
              >
                <Field orientation="horizontal">
                  <RadioGroupItem id="location-fixed" value="fixed" />
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel htmlFor="location-fixed" className="font-normal">
                      Fixed location
                    </FieldLabel>
                    <p className="text-sm text-muted-foreground">Customers visit your premises.</p>
                  </div>
                </Field>
                <Field orientation="horizontal">
                  <RadioGroupItem id="location-mobile" value="mobile" />
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel htmlFor="location-mobile" className="font-normal">
                      Mobile
                    </FieldLabel>
                    <p className="text-sm text-muted-foreground">You travel to customers.</p>
                  </div>
                </Field>
                <Field orientation="horizontal">
                  <RadioGroupItem id="location-online" value="online" />
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel htmlFor="location-online" className="font-normal">
                      Online only
                    </FieldLabel>
                    <p className="text-sm text-muted-foreground">No physical location.</p>
                  </div>
                </Field>
              </RadioGroup>
            )}
          />

          {locationType === "fixed" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field className="sm:col-span-2" data-invalid={!!errors.address || undefined}>
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Controller
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <AddressSearchField
                      businessUuid={businessUuid}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        // Manual edits invalidate picked coordinates.
                        form.setValue("latitude", null, { shouldDirty: true });
                        form.setValue("longitude", null, { shouldDirty: true });
                      }}
                      onPick={(result) => {
                        field.onChange(
                          [result.address, [result.suburb, result.state, result.postcode].filter(Boolean).join(" ")]
                            .filter(Boolean)
                            .join(", ")
                        );
                        form.setValue("latitude", result.latitude, { shouldDirty: true });
                        form.setValue("longitude", result.longitude, { shouldDirty: true });
                      }}
                      invalid={!!errors.address}
                    />
                  )}
                />
                {errors.address && <FieldError>{errors.address.message}</FieldError>}
              </Field>

              <Field className="sm:col-span-2" data-invalid={!!errors.landmark || undefined}>
                <FieldLabel htmlFor="landmark">Landmark (optional)</FieldLabel>
                <Input
                  id="landmark"
                  placeholder="Next to the post office"
                  autoComplete="off"
                  aria-invalid={!!errors.landmark}
                  {...form.register("landmark")}
                />
                {errors.landmark && <FieldError>{errors.landmark.message}</FieldError>}
              </Field>
            </div>
          )}

          {locationType === "mobile" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={!!errors.base_location || undefined}>
                <FieldLabel htmlFor="base_location">Base location</FieldLabel>
                <Input
                  id="base_location"
                  placeholder="Newcastle NSW"
                  autoComplete="off"
                  aria-invalid={!!errors.base_location}
                  {...form.register("base_location")}
                />
                {errors.base_location && <FieldError>{errors.base_location.message}</FieldError>}
              </Field>

              <Field data-invalid={!!errors.travel_radius_km || undefined}>
                <FieldLabel htmlFor="travel_radius_km">Travel radius (km)</FieldLabel>
                <Input
                  id="travel_radius_km"
                  inputMode="numeric"
                  placeholder="50"
                  autoComplete="off"
                  aria-invalid={!!errors.travel_radius_km}
                  {...form.register("travel_radius_km")}
                />
                {errors.travel_radius_km && (
                  <FieldError>{errors.travel_radius_km.message}</FieldError>
                )}
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        {isDirty && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              form.reset();
              if (draft) onDraftHandled();
            }}
          >
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
