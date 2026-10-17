"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/business-profile/money-input";
import { isUnitPriced, type PriceType } from "@/lib/api/types";

const TYPE_LABELS: Record<PriceType, string> = {
  fixed: "Fixed",
  hourly: "Per hour",
  daily: "Per day",
  weekly: "Per week",
  monthly: "Per month",
  yearly: "Per year",
  range: "Range",
  custom_message: "Custom message",
};

/**
 * Flexible pricing block (has_price, ai_can_quote_price, price_type +
 * conditional amount fields). Services pass all 8 price types, products
 * pass PRODUCT_PRICE_TYPES.
 */
export function PriceEditor({ priceTypes }: { priceTypes: readonly PriceType[] }) {
  const form = useFormContext();
  const hasPrice = useWatch({ name: "has_price" }) as boolean;
  const priceType = useWatch({ name: "price_type" }) as PriceType | "";
  const priceMessage = (useWatch({ name: "price_message" }) ?? "") as string;
  const { errors } = form.formState;

  const errorOf = (name: string) =>
    (errors[name] as { message?: string } | undefined)?.message;

  // Base UI's SelectValue renders the raw value unless the root knows the
  // item labels — without this the trigger shows e.g. "custom_message".
  const typeItems = priceTypes.map((type) => ({
    value: type,
    label: TYPE_LABELS[type],
  }));

  return (
    <div className="flex flex-col gap-4">
      <Field orientation="horizontal">
        <Controller
          control={form.control}
          name="has_price"
          render={({ field }) => (
            <Switch id="has_price" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        <FieldLabel htmlFor="has_price" className="font-normal">
          Has a price
        </FieldLabel>
      </Field>

      {hasPrice && (
        <>
          <Field orientation="horizontal">
            <Controller
              control={form.control}
              name="ai_can_quote_price"
              render={({ field }) => (
                <Switch
                  id="ai_can_quote_price"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <div className="flex flex-col gap-0.5">
              <FieldLabel htmlFor="ai_can_quote_price" className="font-normal">
                AI can quote the price
              </FieldLabel>
              <p className="text-sm text-muted-foreground">
                Off keeps the price for your records — it&apos;s never spoken on calls.
              </p>
            </div>
          </Field>

          <Field data-invalid={!!errorOf("price_type") || undefined}>
            <FieldLabel htmlFor="price_type">Price type</FieldLabel>
            <Controller
              control={form.control}
              name="price_type"
              render={({ field }) => (
                <Select
                  items={typeItems}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange((value as string | null) ?? "")}
                >
                  <SelectTrigger
                    id="price_type"
                    className="w-full"
                    aria-invalid={!!errorOf("price_type")}
                  >
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errorOf("price_type") && <FieldError>{errorOf("price_type")}</FieldError>}
          </Field>

          {isUnitPriced(priceType) && (
            <Field data-invalid={!!errorOf("price_cents") || undefined}>
              <FieldLabel htmlFor="price_cents">
                {priceType === "fixed" ? "Price" : `Price ${TYPE_LABELS[priceType as PriceType].toLowerCase()}`}
              </FieldLabel>
              <MoneyInput id="price_cents" name="price_cents" invalid={!!errorOf("price_cents")} />
              {errorOf("price_cents") && <FieldError>{errorOf("price_cents")}</FieldError>}
            </Field>
          )}

          {priceType === "range" && (
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errorOf("price_min_cents") || undefined}>
                <FieldLabel htmlFor="price_min_cents">Minimum</FieldLabel>
                <MoneyInput
                  id="price_min_cents"
                  name="price_min_cents"
                  invalid={!!errorOf("price_min_cents")}
                />
                {errorOf("price_min_cents") && (
                  <FieldError>{errorOf("price_min_cents")}</FieldError>
                )}
              </Field>
              <Field data-invalid={!!errorOf("price_max_cents") || undefined}>
                <FieldLabel htmlFor="price_max_cents">Maximum</FieldLabel>
                <MoneyInput
                  id="price_max_cents"
                  name="price_max_cents"
                  invalid={!!errorOf("price_max_cents")}
                />
                {errorOf("price_max_cents") && (
                  <FieldError>{errorOf("price_max_cents")}</FieldError>
                )}
              </Field>
            </div>
          )}

          {priceType === "custom_message" && (
            <Field data-invalid={!!errorOf("price_message") || undefined}>
              <FieldLabel htmlFor="price_message">What to say instead of a price</FieldLabel>
              <Textarea
                id="price_message"
                rows={3}
                placeholder="Quoted after a free inspection."
                aria-invalid={!!errorOf("price_message")}
                {...form.register("price_message")}
              />
              <p className="text-right text-sm text-muted-foreground">
                {priceMessage.length} / 500
              </p>
              {errorOf("price_message") && <FieldError>{errorOf("price_message")}</FieldError>}
            </Field>
          )}
        </>
      )}
    </div>
  );
}
