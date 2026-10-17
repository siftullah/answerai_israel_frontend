"use client";

import { CircleCheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChoiceCardOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

/**
 * Box-style single-choice selector — bordered cards side by side instead
 * of radio rows; the active card gets a primary ring and check.
 */
export function ChoiceCards<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly ChoiceCardOption<T>[];
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn("grid gap-2.5 sm:grid-cols-2", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex flex-col gap-1 rounded-2xl border p-4 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "hover:bg-muted/40"
            )}
          >
            {active && (
              <CircleCheckIcon className="absolute top-3.5 right-3.5 size-4.5 text-primary" />
            )}
            <span className="pr-6 text-base font-medium">{option.label}</span>
            {option.description && (
              <span className="text-sm text-muted-foreground">
                {option.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
