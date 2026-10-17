"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

/** Multi-value chip input: Enter, comma or blur adds; chips remove.
 * Duplicates are ignored case-insensitively. */
export function ChipInput({
  id,
  value,
  onChange,
  max,
  maxItemLength,
  placeholder,
  limitPlaceholder = "Limit reached",
  invalid,
  disabled,
}: {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  max: number;
  maxItemLength: number;
  placeholder: string;
  limitPlaceholder?: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const next = input.trim().slice(0, maxItemLength);
    setInput("");
    if (!next || value.length >= max) return;
    if (value.some((item) => item.toLowerCase() === next.toLowerCase())) return;
    onChange([...value, next]);
  };

  const atLimit = value.length >= max;

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 pr-1">
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                className="rounded-full p-0.5 hover:bg-foreground/10"
                onClick={() => onChange(value.filter((v) => v !== item))}
                disabled={disabled}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        id={id}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={atLimit ? limitPlaceholder : placeholder}
        disabled={disabled || atLimit}
        aria-invalid={invalid}
      />
    </div>
  );
}
