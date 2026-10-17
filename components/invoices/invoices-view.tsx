"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

const COPY: Record<InvoiceTab, { emptyTitle: string; emptyDescription: string }> = {
  open: {
    emptyTitle: "No open invoices",
    emptyDescription: "Drafts and invoices awaiting payment will show up here.",
  },
  overdue: {
    emptyTitle: "Nothing overdue",
    emptyDescription: "Invoices that pass their due date unpaid land here.",
  },
  paid: {
    emptyTitle: "No paid invoices yet",
    emptyDescription: "Invoices you mark as paid will appear here.",
  },
  all: {
    emptyTitle: "No invoices yet",
    emptyDescription: "Raise your first invoice for completed work.",
  },
};

const NO_MATCH_COPY = {
  emptyTitle: "No invoices match",
  emptyDescription: "Try a different search or clear some filters.",
};

/**
 * Master-detail shell mirroring the callbacks/appointments pages: list rail +
 * detail pane on one divider, with the money stat strip above. Only the
 * selected invoice lives in the URL (?invoice=…); the tab and filters are
 * page-local, so a deep link lands on the default tab but the pane still
 * renders any uuid.
 */
export function InvoicesView() {
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
      New invoice
    </Button>
  );

  const copy = hasActiveFilters ? NO_MATCH_COPY : COPY[tab];

  return (
    <div className="flex flex-col gap-5 lg:min-h-0 lg:flex-1">
      <PageHeader
        title="Invoices"
        description="Raise invoices for completed work and track what's been paid."
        actions={newInvoiceButton}
      />

      <InvoiceStatTiles
        counts={counts}
        className={cn(selectedId && "hidden lg:grid")}
      />

      <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
        <div
          className={cn(
            "min-h-0 flex-col gap-3 lg:flex lg:w-96 lg:shrink-0 lg:border-r lg:pr-5",
            selectedId ? "hidden" : "flex"
          )}
        >
          <Tabs value={tab} onValueChange={(value) => changeTab(value as InvoiceTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="open">
                Open
                {counts !== undefined && counts.open > 0 && (
                  <Badge variant="outline" className="h-5">
                    {counts.open}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="overdue">
                Overdue
                {counts !== undefined && counts.overdue > 0 && (
                  <Badge variant="destructive" className="h-5">
                    {counts.overdue}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          <InvoiceListFilters
            search={search}
            onSearchChange={setSearch}
            filters={filters}
            onFiltersChange={setFilters}
            statuses={TAB_REFINE[tab]}
          />

          <div className="scrollbar-slim min-h-0 flex-1 lg:overflow-y-auto lg:pr-1.5 lg:-mr-3">
            <InvoiceList
              businessUuid={business.id}
              filters={apiFilters}
              selectedId={selectedId}
              onSelect={select}
              emptyTitle={copy.emptyTitle}
              emptyDescription={copy.emptyDescription}
              emptyAction={hasActiveFilters ? undefined : newInvoiceButton}
            />
          </div>
        </div>

        <div
          // Keyed so switching invoices starts the pane back at the top.
          key={selectedId ?? "empty"}
          className={cn(
            "min-h-0 min-w-0 flex-1 lg:pl-8",
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
