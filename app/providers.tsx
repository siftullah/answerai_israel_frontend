"use client";

import { useState } from "react";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { z } from "zod";
import { Toaster } from "@/components/ui/sonner";
import { dirFor, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { isApiError } from "@/lib/api/errors";
import { setRuntimeI18n } from "@/lib/i18n/runtime";

// zod's built-in messages (for rules without a custom message, e.g. a bare
// `.max(100)` or enum mismatches) follow the UI language too.
const ZOD_LOCALES: Record<Locale, () => { localeError: z.core.$ZodErrorMap }> = {
  en: z.locales.en,
  he: z.locales.he,
  ar: z.locales.ar,
};

export function Providers({ children }: { children: React.ReactNode }) {
  const locale = useLocale() as Locale;
  const messages = useMessages();
  const tc = useTranslations("common");
  // Keeps the non-React translator (date/money formatters, API error copy)
  // in step with the provider — runs before any child renders.
  setRuntimeI18n(locale, messages as Messages);
  z.config(ZOD_LOCALES[locale]());
  const dir = dirFor(locale);

  // useState initializer: one client per browser session, stable across HMR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (isApiError(error) && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
            staleTime: 30_000,
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    // Base UI reads the direction for keyboard navigation and popup placement.
    <DirectionProvider direction={dir}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          richColors
          dir={dir}
          position={dir === "rtl" ? "top-left" : "top-right"}
          containerAriaLabel={tc("toaster.label")}
        />
        {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </DirectionProvider>
  );
}
