"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TimeInput } from "@/components/ui/time-input";
import type { BusinessHourRowPayload, Weekday } from "@/lib/api/types";
import { displayLocale } from "@/lib/i18n/runtime";

/** Offsets from Sunday — a fixed Sunday-first week keyed by the API's day names. */
const WEEKDAY_OFFSET: Record<Weekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/** 2024-01-07 is a Sunday; formatting it +offset in UTC yields each weekday's name. */
const SUNDAY_UTC = Date.UTC(2024, 0, 7);

function weekdayNames(locale: string): Record<Weekday, string> {
  const format = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
  const names = {} as Record<Weekday, string>;
  for (const [day, offset] of Object.entries(WEEKDAY_OFFSET) as [Weekday, number][]) {
    names[day] = format.format(new Date(SUNDAY_UTC + offset * 86_400_000));
  }
  return names;
}

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
  const t = useTranslations("businessProfile.weeklyHours");
  const locale = displayLocale();
  const dayLabels = useMemo(() => weekdayNames(locale), [locale]);

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
              aria-label={t("availableOn", { day: dayLabels[row.day] })}
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
            <span className="text-sm">{dayLabels[row.day]}</span>
          </div>

          {row.is_available ? (
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {row.windows.map((window, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <TimeInput
                    value={window.start}
                    aria-label={t("windowStart", { day: dayLabels[row.day], number: index + 1 })}
                    className="h-8 w-fit"
                    onChange={(event) =>
                      patchRow(row.day, {
                        windows: row.windows.map((w, i) =>
                          i === index ? { ...w, start: event.target.value } : w
                        ),
                      })
                    }
                  />
                  <span className="text-sm text-muted-foreground">{t("to")}</span>
                  <TimeInput
                    value={window.end}
                    aria-label={t("windowEnd", { day: dayLabels[row.day], number: index + 1 })}
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
                      aria-label={t("removeWindow")}
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
                {t("addWindow")}
              </Button>
            </div>
          ) : (
            <p className="pt-1.5 text-sm text-muted-foreground">{t("unavailable")}</p>
          )}
        </div>
      ))}
    </div>
  );
}
