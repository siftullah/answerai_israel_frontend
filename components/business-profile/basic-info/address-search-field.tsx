"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAddressSearch } from "@/hooks/use-address-search";
import type { AddressSearchResult } from "@/lib/api/types";

export function formatAddress(result: AddressSearchResult): string {
  const locality = [result.suburb, result.state, result.postcode].filter(Boolean).join(" ");
  return [result.address, locality].filter(Boolean).join(", ");
}

/**
 * Address input with Mappify suggestions. Degrades to a plain text input
 * when the backend reports search as unconfigured (503) or the upstream
 * as down (502) — the user can always type the address manually.
 */
export function AddressSearchField({
  businessUuid,
  value,
  onChange,
  onPick,
  invalid,
}: {
  businessUuid: string;
  value: string;
  onChange: (value: string) => void;
  onPick: (result: AddressSearchResult) => void;
  invalid?: boolean;
}) {
  const t = useTranslations("businessProfile.address");
  const [open, setOpen] = useState(false);
  const search = useAddressSearch(businessUuid, value);

  const searchOff = search.notConfigured || search.unavailable;
  const showList = open && value.trim().length >= 3 && !searchOff;

  return (
    <div className="relative">
      <Input
        id="address"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Suggestion buttons commit on mousedown, before this blur fires.
        onBlur={() => setOpen(false)}
        placeholder={t("placeholder")}
        autoComplete="off"
        aria-invalid={invalid}
      />
      {search.notConfigured && (
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("notConfigured")}
        </p>
      )}
      {search.unavailable && (
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("unavailable")}
        </p>
      )}
      {showList && (
        <div className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-md">
          {search.isFetching && !search.data ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              {t("searching")}
            </div>
          ) : search.data && search.data.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto py-1">
              {search.data.map((result, index) => (
                <li key={`${result.address}-${index}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-start text-sm hover:bg-accent hover:text-accent-foreground"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onPick(result);
                      setOpen(false);
                    }}
                  >
                    {formatAddress(result)}
                  </button>
                </li>
              ))}
            </ul>
          ) : search.data ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">
              {t("noMatches")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
