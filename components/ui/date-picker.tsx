"use client";

import { useState } from "react";
import { CalendarIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateKey, parseDateKey, toDateKey } from "@/lib/datetime";
import { cn } from "@/lib/utils";

/**
 * Calendar-key date field: a popover Calendar behind an outline trigger.
 * Renders the control only — the caller owns Field/FieldLabel/FieldError, the
 * same split as TimezoneCombobox. The value is always a "YYYY-MM-DD" key (or ""
 * for unset), never a UTC instant; display goes through formatDateKey.
 */
export function DatePicker({
  id,
  ref,
  value,
  onChange,
  placeholder = "Pick a date",
  invalid,
  disabled,
  clearable = false,
  disablePast = false,
  className,
}: {
  id?: string;
  /** Wire react-hook-form's `field.ref` here so shouldFocus lands on the trigger. */
  ref?: React.Ref<HTMLButtonElement>;
  /** A calendar key "YYYY-MM-DD", or "" for unset. */
  value: string;
  /** Emits "" only when `clearable`. */
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** Adds a clear row inside the popover — only for fields where "" is valid. */
  clearable?: boolean;
  /** Floors the calendar at the viewer's today. */
  disablePast?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseDateKey(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            ref={ref}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid}
            className={cn(
              "w-full justify-start font-normal",
              !value && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <CalendarIcon className="text-muted-foreground" />
        {value ? formatDateKey(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-0 p-0">
        <Calendar
          mode="single"
          selected={selected}
          // react-day-picker picks its month from month || defaultMonth ||
          // today, not from the selection — without this it always opens on the
          // current month and hides a selection elsewhere. The popup unmounts on
          // close, so this is re-derived every open.
          defaultMonth={selected}
          disabled={disablePast ? { before: today } : undefined}
          onSelect={(day) => {
            // Re-clicking the selected day deselects in rdp; for a required
            // field that would silently empty it, so only honor it when clearable.
            if (day) onChange(toDateKey(day));
            else if (clearable) onChange("");
            setOpen(false);
          }}
        />
        {clearable && value !== "" && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start font-normal"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <XIcon />
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
