"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { centsToDollarsInput, dollarsToCents } from "@/lib/money";

/**
 * Dollar-denominated input over an integer-cents form field. The display
 * string is local state committed on blur; external form changes (reset,
 * draft prefill) re-sync it via the previous-value compare pattern.
 */
export function MoneyInput({
  name,
  id,
  invalid,
  placeholder = "0.00",
}: {
  name: string;
  id: string;
  invalid?: boolean;
  placeholder?: string;
}) {
  const form = useFormContext();
  const cents = useWatch({ name }) as number | null;

  const [text, setText] = useState(() => centsToDollarsInput(cents));
  const [prevCents, setPrevCents] = useState(cents);
  if (cents !== prevCents) {
    setPrevCents(cents);
    if (cents !== dollarsToCents(text)) {
      setText(centsToDollarsInput(cents));
    }
  }

  const commit = () => {
    form.setValue(name, dollarsToCents(text), {
      shouldDirty: true,
      shouldValidate: form.formState.submitCount > 0,
    });
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-sm text-muted-foreground">
        ₪
      </span>
      <Input
        id={id}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        inputMode="decimal"
        placeholder={placeholder}
        autoComplete="off"
        aria-invalid={invalid}
        className="ps-7"
      />
    </div>
  );
}
