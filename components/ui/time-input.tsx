"use client";

import { Input } from "@/components/ui/input";

/**
 * Native time input that opens the browser picker on a click anywhere in the
 * field, not just on the clock icon. Typing still works — the picker accepts
 * keyboard input while open. Keeps Input's full prop surface, so call sites are
 * a one-token swap (register spread, value/onChange, className all pass through).
 */
export function TimeInput({
  onClick,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  return (
    <Input
      {...props}
      type="time"
      onClick={(event) => {
        onClick?.(event);
        const input = event.currentTarget;
        // showPicker throws InvalidStateError on a disabled/readonly input and
        // NotAllowedError without transient activation (a real click has it).
        // Older Safari/Firefox lack the method; there the native indicator still
        // opens the picker, so degrade silently.
        if (event.defaultPrevented || input.disabled || input.readOnly) return;
        if (typeof input.showPicker !== "function") return;
        try {
          input.showPicker();
        } catch {
          // Engine refused (e.g. unsupported type) — nothing to recover.
        }
      }}
    />
  );
}
