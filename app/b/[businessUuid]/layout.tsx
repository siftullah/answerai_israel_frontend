"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/error-state";
import { FullPageLoader } from "@/components/full-page-loader";
import { RequireAuth, RequireVerified } from "@/components/auth/guards";
import { AppShell } from "@/components/layout/app-shell";
import { BusinessProvider } from "@/components/business/business-provider";
import { useMe } from "@/hooks/use-me";
import { useModules } from "@/hooks/use-modules";
import {
  clearLastUsedBusiness,
  getLastUsedBusiness,
  setLastUsedBusiness,
} from "@/lib/business/last-used";

/**
 * Tenancy gate: resolves the URL's business uuid against the user's
 * memberships, then blocks on the business's module enablement (the sidebar
 * and module routes both need it). A membership miss renders a card (no
 * auto-redirect — a stale last-used uuid pointing at a business you were
 * removed from must not loop).
 */
function BusinessGate({ children }: { children: React.ReactNode }) {
  const { businessUuid } = useParams<{ businessUuid: string }>();
  const { data } = useMe();

  // Plans is a standalone full-page screen with its own header — every other
  // segment renders inside the shell. Auth/membership gating is unaffected.
  const bare = useSelectedLayoutSegment() === "plans";
  const shell = (node: React.ReactNode) => (bare ? node : <AppShell>{node}</AppShell>);

  const membership = data?.memberships.find((m) => m.business.id === businessUuid);

  // Only fires once membership is confirmed — a non-member must see the
  // no-access card, not a doomed 403 request.
  const modulesQuery = useModules(membership ? businessUuid : undefined);

  useEffect(() => {
    if (membership) {
      setLastUsedBusiness(membership.business.id);
    } else if (data && getLastUsedBusiness() === businessUuid) {
      clearLastUsedBusiness();
    }
  }, [membership, data, businessUuid]);

  if (!data) return <FullPageLoader />;

  if (!membership) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>No access to this business</CardTitle>
            <CardDescription>
              It may have been removed, or you&apos;re no longer a member.
            </CardDescription>
          </CardHeader>
          <CardContent className="justify-center">
            <Button render={<Link href="/select-business" />}>Choose a business</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // The membership check above must come first: a disabled query stays
  // pending forever, so this order is what lets non-members see the card.
  if (modulesQuery.isPending) return <FullPageLoader />;

  if (modulesQuery.isError) {
    // 402 is the subscription gate, not a failure: the plans/billing corner
    // of the portal must still render so the user can subscribe or fix
    // payment (the API client already redirects every other page there).
    if (modulesQuery.error.status === 402) {
      return (
        <BusinessProvider
          value={{ business: membership.business, membership, modules: [] }}
        >
          {shell(children)}
        </BusinessProvider>
      );
    }

    return (
      <ErrorState
        title="Couldn't load this business"
        message={modulesQuery.error.message}
        onRetry={() => modulesQuery.refetch()}
      />
    );
  }

  return (
    <BusinessProvider
      value={{ business: membership.business, membership, modules: modulesQuery.data }}
    >
      {shell(children)}
    </BusinessProvider>
  );
}

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <RequireVerified>
        <BusinessGate>{children}</BusinessGate>
      </RequireVerified>
    </RequireAuth>
  );
}
