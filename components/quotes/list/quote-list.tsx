"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";
import { QuoteListRow } from "@/components/quotes/list/quote-list-row";
import { useBusiness } from "@/components/business/business-provider";
import { useQuotesInfinite } from "@/hooks/use-quotes";
import type { Quote, QuoteListFilters } from "@/lib/api/types";

/**
 * The infinite rail. Pages load as the sentinel scrolls into view (the rail
 * itself is the nearest scroll container, so no root is passed).
 */
export function QuoteList({
  businessUuid,
  filters,
  selectedId,
  onSelect,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  businessUuid: string;
  filters: QuoteListFilters;
  selectedId: string | null;
  onSelect: (quote: Quote) => void;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
}) {
  const t = useTranslations("quotes.list");
  const { business } = useBusiness();
  const query = useQuotesInfinite(businessUuid, filters);
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
        title={t("loadError")}
        message={query.error.message}
        onRetry={() => query.refetch()}
      />
    );
  }

  const quotes = query.data.pages.flatMap((page) => page.data);

  if (quotes.length === 0) {
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
      {quotes.map((quote) => (
        <QuoteListRow
          key={quote.id}
          quote={quote}
          selected={quote.id === selectedId}
          timeZone={business.timezone}
          onSelect={() => onSelect(quote)}
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
