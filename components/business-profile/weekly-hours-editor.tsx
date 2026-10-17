"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TimeInput } from "@/components/ui/time-input";
import type { BusinessHourRowPayload, Weekday } from "@/lib/api/types";

const DAY_LABELS: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

/**
 * Controlled weekly-hours grid (value/onChange, not form-context) so it
 * can back transfer targets now and the business-hours page later.
 */
export function WeeklyHoursEditor({
  value,
  onChange,
}: {
  value: BusinessHourRowPayload[];
  onChange: (value: BusinessHourRowPayload[]) => void;
}) {
  const patchRow = (day: Weekday, patch: Partial<BusinessHourRowPayload>) => {
    onChange(value.map((row) => (row.day === day ? { ...row, ...patch } : row)));
  };

  return (
    <div className="flex flex-col gap-2">
      {value.map((row) => (
        <div key={row.day} className="flex items-start gap-3 rounded-xl border px-3 py-2">
          <div className="flex w-32 shrink-0 items-center gap-2.5 pt-1">
            <Switch
              checked={row.is_available}
              aria-label={`Available on ${DAY_LABELS[row.day]}`}
              onCheckedChange={(checked) =>
                patchRow(row.day, {
                  is_available: checked,
                  windows:
                    checked && row.windows.length === 0
                      ? [{ start: "09:00", end: "17:00" }]
                      : row.windows,
                })
              }
            />
            <span className="text-sm">{DAY_LABELS[row.day]}</span>
          </div>

          {row.is_available ? (
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {row.windows.map((window, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <TimeInput
                    value={window.start}
                    aria-label={`${DAY_LABELS[row.day]} window ${index + 1} start`}
                    className="h-8 w-fit"
                    onChange={(event) =>
                      patchRow(row.day, {
                        windows: row.windows.map((w, i) =>
                          i === index ? { ...w, start: event.target.value } : w
                        ),
                      })
                    }
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <TimeInput
                    value={window.end}
                    aria-label={`${DAY_LABELS[row.day]} window ${index + 1} end`}
                    className="h-8 w-fit"
                    onChange={(event) =>
                      patchRow(row.day, {
                        windows: row.windows.map((w, i) =>
                          i === index ? { ...w, end: event.target.value } : w
                        ),
                      })
                    }
                  />
                  {row.windows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove window"
                      onClick={() =>
                        patchRow(row.day, {
                          windows: row.windows.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <XIcon />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() =>
                  patchRow(row.day, {
                    windows: [...row.windows, { start: "09:00", end: "17:00" }],
                  })
                }
              >
                <PlusIcon />
                Add window
              </Button>
            </div>
          ) : (
            <p className="pt-1.5 text-sm text-muted-foreground">Unavailable</p>
          )}
        </div>
      ))}
    </div>
  );
}
