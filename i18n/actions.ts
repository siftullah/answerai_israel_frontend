"use server";

import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE } from "./config";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Persists the picker's choice; the caller refreshes the router afterwards. */
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set({
    name: LOCALE_COOKIE,
    value: locale,
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
}
