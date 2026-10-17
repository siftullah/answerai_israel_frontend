"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ErrorState } from "@/components/error-state";
import { FullPageLoader } from "@/components/full-page-loader";
import { useMe } from "@/hooks/use-me";

function isLoggedOut(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: number }).status === 401
  );
}

/**
 * Renders children only for an authenticated user; a logged-out visitor is
 * sent to /login with a return URL. All redirects run in effects, never
 * during render.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data, error, isPending, refetch } = useMe();
  const router = useRouter();
  const pathname = usePathname();

  const loggedOut = !isPending && isLoggedOut(error);

  useEffect(() => {
    if (loggedOut) {
      const returnTo = pathname + window.location.search;
      router.replace(`/login?return=${encodeURIComponent(returnTo)}`);
    }
  }, [loggedOut, pathname, router]);

  if (isPending || loggedOut) return <FullPageLoader />;
  if (error) {
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }
  if (!data) return <FullPageLoader />;

  return <>{children}</>;
}

/**
 * Must be composed INSIDE RequireAuth. Sends unverified users to the
 * verify-email screen.
 */
export function RequireVerified({ children }: { children: React.ReactNode }) {
  const { data } = useMe();
  const router = useRouter();

  const unverified = !!data && !data.user.email_verified;

  useEffect(() => {
    if (unverified) router.replace("/verify-email");
  }, [unverified, router]);

  if (!data || unverified) return <FullPageLoader />;

  return <>{children}</>;
}

/**
 * For auth screens (login/register/...): renders children immediately —
 * no spinner flash for anonymous visitors — and bounces already-authenticated
 * users to the root redirect.
 */
export function PublicOnly({ children }: { children: React.ReactNode }) {
  const { data } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (data) router.replace("/");
  }, [data, router]);

  return <>{children}</>;
}
