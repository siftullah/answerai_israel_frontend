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
import { InvoiceDetailPane } from "@/components/invoices/detail/invoice-detail-pane";
import { InvoiceFormDialog } from "@/components/invoices/invoice-form-dialog";
import { InvoiceStatTiles } from "@/components/invoices/invoice-stat-tiles";
import { InvoiceList } from "@/components/invoices/list/invoice-list";
import {
  EMPTY_INVOICE_FILTERS,
  InvoiceListFilters,
  type InvoiceFilterState,
} from "@/components/invoices/list/invoice-list-filters";
import { useInvoiceCounts } from "@/hooks/use-invoices";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { Invoice, InvoiceListFilters as ApiFilters, InvoiceStatus } from "@/lib/api/types";
import { INVOICE_STATUSES, OPEN_INVOICE_STATUSES } from "@/lib/api/types";

export type InvoiceTab = "open" | "overdue" | "paid" | "all";

/** Each tab's base status set; "" = no status filter (the All tab). */
const TAB_STATUSES: Record<InvoiceTab, string> = {
  open: OPEN_INVOICE_STATUSES.join(","),
  overdue: "overdue",
  paid: "paid",
  all: "",
};

/** Refine options per tab — single-status tabs offer none. */
const TAB_REFINE: Record<InvoiceTab, readonly InvoiceStatus[]> = {
  open: OPEN_INVOICE_STATUSES,
  overdue: [],
  paid: [],
  all: INVOICE_STATUSES,
};

/**
 * Master-detail shell mirroring the callbacks/appointments pages: list rail +
 * detail pane on one divider, with the money stat strip above. Only the
 * selected invoice lives in the URL (?invoice=…); the tab and filters are
 * page-local, so a deep link lands on the default tab but the pane still
 * renders any uuid.
 */
export function InvoicesView() {
  const t = useTranslations("invoices");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("invoice");

  const countsQuery = useInvoiceCounts(business.id);

  const [tab, setTab] = useState<InvoiceTab>("open");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<InvoiceFilterState>(EMPTY_INVOICE_FILTERS);
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

  const select = (invoice: Invoice) =>
    router.replace(`${pathname}?invoice=${invoice.id}`, { scroll: false });
  const clearSelection = () => router.replace(pathname, { scroll: false });

  const changeTab = (next: InvoiceTab) => {
    setTab(next);
    // The status refine is tab-scoped; keep the search.
    setFilters(EMPTY_INVOICE_FILTERS);
  };

  const counts = countsQuery.data;
  const newInvoiceButton = (
    <Button onClick={() => setCreating(true)}>
      <PlusIcon />
      {t("newInvoice")}
    </Button>
  );

  const emptyCopy: Record<InvoiceTab | "noMatch", { title: string; description: string }> = {
    open: { title: t("empty.open.title"), description: t("empty.open.description") },
    overdue: { title: t("empty.overdue.title"), description: t("empty.overdue.description") },
    paid: { title: t("empty.paid.title"), description: t("empty.paid.description") },
    all: { title: t("empty.all.title"), description: t("empty.all.description") },
    noMatch: { title: t("empty.noMatch.title"), description: t("empty.noMatch.description") },
  };
  const copy = emptyCopy[hasActiveFilters ? "noMatch" : tab];

  return (
    <div className="flex flex-col gap-5 lg:min-h-0 lg:flex-1">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
        actions={newInvoiceButton}
      />

      <InvoiceStatTiles
        counts={counts}
        className={cn(selectedId && "hidden lg:grid")}
      />

      <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
        <div
          className={cn(
            "min-h-0 flex-col gap-3 lg:flex lg:w-96 lg:shrink-0 lg:border-e lg:pe-5",
            selectedId ? "hidden" : "flex"
          )}
        >
          <Tabs value={tab} onValueChange={(value) => changeTab(value as InvoiceTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="open">
                {t("tabs.open")}
                {counts !== undefined && counts.open > 0 && (
                  <Badge variant="outline" className="h-5">
                    {counts.open}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="overdue">
                {t("tabs.overdue")}
                {counts !== undefined && counts.overdue > 0 && (
                  <Badge variant="destructive" className="h-5">
                    {counts.overdue}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="paid">{t("tabs.paid")}</TabsTrigger>
              <TabsTrigger value="all">{tc("labels.all")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <InvoiceListFilters
            search={search}
            onSearchChange={setSearch}
            filters={filters}
            onFiltersChange={setFilters}
            statuses={TAB_REFINE[tab]}
          />

          <div className="scrollbar-slim min-h-0 flex-1 lg:overflow-y-auto lg:pe-1.5 lg:-me-3">
            <InvoiceList
              businessUuid={business.id}
              filters={apiFilters}
              selectedId={selectedId}
              onSelect={select}
              emptyTitle={copy.title}
              emptyDescription={copy.description}
              emptyAction={hasActiveFilters ? undefined : newInvoiceButton}
            />
          </div>
        </div>

        <div
          // Keyed so switching invoices starts the pane back at the top.
          key={selectedId ?? "empty"}
          className={cn(
            "min-h-0 min-w-0 flex-1 lg:ps-8",
            selectedId ? "flex" : "hidden lg:flex"
          )}
        >
          <InvoiceDetailPane
            businessUuid={business.id}
            invoiceUuid={selectedId}
            onBack={clearSelection}
            onClearSelection={clearSelection}
          />
        </div>
      </div>

      {creating && (
        <InvoiceFormDialog
          open
          onOpenChange={(next) => {
            if (!next) setCreating(false);
          }}
          onSaved={(invoice) => {
            changeTab("open");
            select(invoice);
          }}
        />
      )}
    </div>
  );
}
