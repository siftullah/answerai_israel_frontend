"use client";

import { useEffect, useRef } from "react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";
import { LeadListRow } from "@/components/leads/list/lead-list-row";
import { useBusiness } from "@/components/business/business-provider";
import { useLeadsInfinite } from "@/hooks/use-leads";
import type { Lead, LeadListFilters } from "@/lib/api/types";

/**
 * The infinite rail. Pages load as the sentinel scrolls into view (the rail
 * itself is the nearest scroll container, so no root is passed).
 */
export function LeadList({
  businessUuid,
  filters,
  selectedId,
  onSelect,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  businessUuid: string;
  filters: LeadListFilters;
  selectedId: string | null;
  onSelect: (lead: Lead) => void;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
}) {
  const { business } = useBusiness();
  const query = useLeadsInfinite(businessUuid, filters);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-[84px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Couldn't load leads"
        message={query.error.message}
        onRetry={() => query.refetch()}
      />
    );
  }

  const leads = query.data.pages.flatMap((page) => page.data);

  if (leads.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
        {emptyAction}
      </Empty>
    );
  }

  return (
    <div className="flex flex-col">
      {leads.map((lead) => (
        <LeadListRow
          key={lead.id}
          lead={lead}
          selected={lead.id === selectedId}
          timeZone={business.timezone}
          onSelect={() => onSelect(lead)}
        />
      ))}
      {hasNextPage && <div ref={sentinelRef} aria-hidden className="h-px" />}
      {isFetchingNextPage && (
        <div className="flex justify-center py-3">
          <Spinner className="size-4" />
        </div>
      )}
    </div>
  );
}
