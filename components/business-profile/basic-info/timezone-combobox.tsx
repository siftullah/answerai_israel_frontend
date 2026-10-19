"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Searchable IANA timezone picker, filtered client-side. */
export function TimezoneCombobox({
  value,
  onChange,
  invalid,
  id,
}: {
  value: string;
  onChange: (timezone: string) => void;
  invalid?: boolean;
  id?: string;
}) {
  const t = useTranslations("businessProfile.timezone");
  const [open, setOpen] = useState(false);
  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid}
            className={cn(
              "w-full justify-between font-normal",
              !value && "text-muted-foreground"
            )}
          />
        }
      >
        <span className="min-w-0 truncate">
          {value ? value.replace(/_/g, " ") : t("pick")}
        </span>
        <ChevronsUpDownIcon className="shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput placeholder={t("searchPlaceholder")} />
          <CommandList>
            <CommandEmpty>{t("empty")}</CommandEmpty>
            <CommandGroup>
              {timezones.map((tz) => (
                <CommandItem
                  key={tz}
                  value={tz.replace(/_/g, " ")}
                  onSelect={() => {
                    onChange(tz);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 truncate">{tz.replace(/_/g, " ")}</span>
                  {value === tz && <CheckIcon className="shrink-0" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
