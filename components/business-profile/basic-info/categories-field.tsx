"use client";

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
  return (
    <ChipInput
      id="categories"
      value={value}
      onChange={onChange}
      max={MAX_CATEGORIES}
      maxItemLength={MAX_LENGTH}
      placeholder="Type a category and press Enter"
      limitPlaceholder="Category limit reached"
      invalid={invalid}
    />
  );
}
