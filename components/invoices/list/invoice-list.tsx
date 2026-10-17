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
import { InvoiceListRow } from "@/components/invoices/list/invoice-list-row";
import { useBusiness } from "@/components/business/business-provider";
import { useInvoicesInfinite } from "@/hooks/use-invoices";
import type { Invoice, InvoiceListFilters } from "@/lib/api/types";

/**
 * The infinite rail. Pages load as the sentinel scrolls into view (the rail
 * itself is the nearest scroll container, so no root is passed).
 */
export function InvoiceList({
  businessUuid,
  filters,
  selectedId,
  onSelect,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  businessUuid: string;
  filters: InvoiceListFilters;
  selectedId: string | null;
  onSelect: (invoice: Invoice) => void;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
}) {
  const { business } = useBusiness();
  const query = useInvoicesInfinite(businessUuid, filters);
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
        title="Couldn't load invoices"
        message={query.error.message}
        onRetry={() => query.refetch()}
      />
    );
  }

  const invoices = query.data.pages.flatMap((page) => page.data);

  if (invoices.length === 0) {
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
      {invoices.map((invoice) => (
        <InvoiceListRow
          key={invoice.id}
          invoice={invoice}
          selected={invoice.id === selectedId}
          timeZone={business.timezone}
          onSelect={() => onSelect(invoice)}
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
