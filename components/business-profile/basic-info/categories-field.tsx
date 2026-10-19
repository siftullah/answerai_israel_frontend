"use client";

import { useTranslations } from "next-intl";
import { ChipInput } from "@/components/ui/chip-input";

const MAX_CATEGORIES = 10;
const MAX_LENGTH = 60;

/** Tag input for business categories: Enter or comma adds, chips remove. */
export function CategoriesField({
  value,
  onChange,
  invalid,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  invalid?: boolean;
}) {
  const t = useTranslations("businessProfile.categories");
  return (
    <ChipInput
      id="categories"
      value={value}
      onChange={onChange}
      max={MAX_CATEGORIES}
      maxItemLength={MAX_LENGTH}
      placeholder={t("placeholder")}
      limitPlaceholder={t("limitReached")}
      invalid={invalid}
    />
  );
}
