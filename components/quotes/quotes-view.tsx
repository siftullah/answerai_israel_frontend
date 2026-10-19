"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness } from "@/components/business/business-provider";
import { QuoteDetailPane } from "@/components/quotes/detail/quote-detail-pane";
import { QuoteFormDialog } from "@/components/quotes/quote-form-dialog";
import { QuoteStatTiles } from "@/components/quotes/quote-stat-tiles";
import { QuoteList } from "@/components/quotes/list/quote-list";
import {
  EMPTY_QUOTE_FILTERS,
  QuoteListFilters,
  type QuoteFilterState,
} from "@/components/quotes/list/quote-list-filters";
import { useQuoteCounts } from "@/hooks/use-quotes";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { Quote, QuoteListFilters as ApiFilters, QuoteStatus } from "@/lib/api/types";
import { OPEN_QUOTE_STATUSES, QUOTE_STATUSES } from "@/lib/api/types";

export type QuoteTab = "open" | "expired" | "accepted" | "all";

/** Each tab's base status set; "" = no status filter (the All tab). */
const TAB_STATUSES: Record<QuoteTab, string> = {
  open: OPEN_QUOTE_STATUSES.join(","),
  expired: "expired",
  accepted: "accepted",
  all: "",
};

/** Refine options per tab — single-status tabs offer none. */
const TAB_REFINE: Record<QuoteTab, readonly QuoteStatus[]> = {
  open: OPEN_QUOTE_STATUSES,
  expired: [],
  accepted: [],
  all: QUOTE_STATUSES,
};

/**
 * Master-detail shell mirroring the invoices page: list rail + detail pane on
 * one divider, with the pipeline stat strip above. Only the selected quote
 * lives in the URL (?quote=…); the tab and filters are page-local, so a deep
 * link lands on the default tab but the pane still renders any uuid.
 */
export function QuotesView() {
  const t = useTranslations("quotes");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("quote");

  const countsQuery = useQuoteCounts(business.id);

  const [tab, setTab] = useState<QuoteTab>("open");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<QuoteFilterState>(EMPTY_QUOTE_FILTERS);
  const [creating, setCreating] = useState(false);

  const q = useDebouncedValue(search, 400).trim();

  const apiFilters: ApiFilters = useMemo(() => {
    // A status refine narrows the tab's set to that single status.
    const status = filters.status !== "" ? filters.status : TAB_STATUSES[tab];
    return {
      ...(status !== "" ? { status } : {}),
      ...(q !== "" ? { q } : {}),
    };
  }, [tab, q, filters]);

  const hasActiveFilters = q !== "" || filters.status !== "";

  const select = (quote: Quote) =>
    router.replace(`${pathname}?quote=${quote.id}`, { scroll: false });
  const clearSelection = () => router.replace(pathname, { scroll: false });

  const changeTab = (next: QuoteTab) => {
    setTab(next);
    // The status refine is tab-scoped; keep the search.
    setFilters(EMPTY_QUOTE_FILTERS);
  };

  const counts = countsQuery.data;
  const newQuoteButton = (
    <Button onClick={() => setCreating(true)}>
      <PlusIcon />
      {t("newQuote")}
    </Button>
  );

  const emptyCopy: Record<QuoteTab | "noMatch", { title: string; description: string }> = {
    open: { title: t("empty.open.title"), description: t("empty.open.description") },
    expired: { title: t("empty.expired.title"), description: t("empty.expired.description") },
    accepted: { title: t("empty.accepted.title"), description: t("empty.accepted.description") },
    all: { title: t("empty.all.title"), description: t("empty.all.description") },
    noMatch: { title: t("empty.noMatch.title"), description: t("empty.noMatch.description") },
  };
  const copy = emptyCopy[hasActiveFilters ? "noMatch" : tab];

  return (
    <div className="flex flex-col gap-5 lg:min-h-0 lg:flex-1">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
        actions={newQuoteButton}
      />

      <QuoteStatTiles counts={counts} className={cn(selectedId && "hidden lg:grid")} />

      <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
        <div
          className={cn(
            "min-h-0 flex-col gap-3 lg:flex lg:w-96 lg:shrink-0 lg:border-e lg:pe-5",
            selectedId ? "hidden" : "flex"
          )}
        >
          <Tabs value={tab} onValueChange={(value) => changeTab(value as QuoteTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="open">
                {t("tabs.open")}
                {counts !== undefined && counts.open > 0 && (
                  <Badge variant="outline" className="h-5">
                    {counts.open}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="expired">
                {t("tabs.expired")}
                {counts !== undefined && counts.expired > 0 && (
                  <Badge variant="warning" className="h-5">
                    {counts.expired}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="accepted">{t("tabs.accepted")}</TabsTrigger>
              <TabsTrigger value="all">{tc("labels.all")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <QuoteListFilters
            search={search}
            onSearchChange={setSearch}
            filters={filters}
            onFiltersChange={setFilters}
            statuses={TAB_REFINE[tab]}
          />

          <div className="scrollbar-slim min-h-0 flex-1 lg:overflow-y-auto lg:pe-1.5 lg:-me-3">
            <QuoteList
              businessUuid={business.id}
              filters={apiFilters}
              selectedId={selectedId}
              onSelect={select}
              emptyTitle={copy.title}
              emptyDescription={copy.description}
              emptyAction={hasActiveFilters ? undefined : newQuoteButton}
            />
          </div>
        </div>

        <div
          // Keyed so switching quotes starts the pane back at the top.
          key={selectedId ?? "empty"}
          className={cn(
            "min-h-0 min-w-0 flex-1 lg:ps-8",
            selectedId ? "flex" : "hidden lg:flex"
          )}
        >
          <QuoteDetailPane
            businessUuid={business.id}
            quoteUuid={selectedId}
            onBack={clearSelection}
            onClearSelection={clearSelection}
          />
        </div>
      </div>

      {creating && (
        <QuoteFormDialog
          open
          onOpenChange={(next) => {
            if (!next) setCreating(false);
          }}
          onSaved={(quote) => {
            changeTab("open");
            select(quote);
          }}
        />
      )}
    </div>
  );
}
