"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, LanguagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateProfile } from "@/hooks/use-profile";
import { setLocale } from "@/i18n/actions";
import { localeNames, locales, type Locale } from "@/i18n/config";
import type { MeResponse } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

/**
 * UI language switcher. Writes the locale cookie through a server action and
 * refreshes the router so the root layout re-renders with the new language
 * and direction — in-memory state (forms, query cache) survives.
 *
 * A signed-in user's pick is also saved on their account (PATCH /me): their
 * emails are written in it and their other devices open the portal in it
 * (useAccountLocale). Anonymous visitors — sign-in, the public quote page —
 * only get the cookie.
 */
export function LanguagePicker({
  className,
  variant = "ghost",
}: {
  className?: string;
  variant?: "ghost" | "outline";
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateProfile = useUpdateProfile();
  const [isPending, startTransition] = useTransition();

  const choose = (next: Locale) => {
    if (next === locale) return;
    // /me in the cache means a signed-in user; nothing has fetched it on the
    // anonymous pages, and this must not start doing so.
    if (queryClient.getQueryData<MeResponse>(queryKeys.me)) {
      updateProfile.mutate({ locale: next });
    }
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant={variant}
            size="sm"
            className={cn("gap-1.5", className)}
            aria-label={t("language.label")}
            disabled={isPending}
          />
        }
      >
        <LanguagesIcon className="size-4" />
        <span>{localeNames[locale]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((option) => (
          <DropdownMenuItem key={option} lang={option} onClick={() => choose(option)}>
            <span className="flex-1">{localeNames[option]}</span>
            {option === locale && <CheckIcon className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
