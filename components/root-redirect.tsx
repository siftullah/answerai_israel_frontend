"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/error-state";
import { FullPageLoader } from "@/components/full-page-loader";
import { useMe } from "@/hooks/use-me";
import { getLastUsedBusiness, setLastUsedBusiness } from "@/lib/business/last-used";

/**
 * The "/" decision logic. Renders only a boot spinner; every outcome is a
 * redirect: login (logged out), verify-email (unverified), a business
 * dashboard (single or last-used membership), or the chooser.
 */
export function RootRedirect() {
  const { data, error, isPending, refetch } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;

    if (error) {
      if (error.status === 401) router.replace("/login");
      return; // other errors render the error state below
    }

    const { user, memberships } = data;

    if (!user.email_verified) {
      router.replace("/verify-email");
      return;
    }

    if (memberships.length === 0) {
      router.replace("/select-business");
      return;
    }

    if (memberships.length === 1) {
      const uuid = memberships[0].business.id;
      setLastUsedBusiness(uuid);
      router.replace(`/b/${uuid}`);
      return;
    }

    const lastUsed = getLastUsedBusiness();
    if (lastUsed && memberships.some((m) => m.business.id === lastUsed)) {
      router.replace(`/b/${lastUsed}`);
      return;
    }

    router.replace("/select-business");
  }, [data, error, isPending, router]);

  if (error && error.status !== 401) {
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }

  return <FullPageLoader />;
}
