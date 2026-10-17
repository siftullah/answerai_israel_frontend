"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness } from "@/components/business/business-provider";
import { LeadDetailPane } from "@/components/leads/detail/lead-detail-pane";
import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { LeadStatTiles } from "@/components/leads/lead-stat-tiles";
import { LeadList } from "@/components/leads/list/lead-list";
import {
  EMPTY_LEAD_FILTERS,
  LeadListFilters,
  type LeadFilterState,
} from "@/components/leads/list/lead-list-filters";
import { useLeadCounts } from "@/hooks/use-leads";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { Lead, LeadListFilters as ApiFilters, LeadStatus } from "@/lib/api/types";
import { LEAD_STATUSES, OPEN_LEAD_STATUSES } from "@/lib/api/types";

export type LeadTab = "open" | "won" | "lost" | "all";

/** Each tab's base status filter; "open" is a backend shorthand, "" = All. */
const TAB_STATUSES: Record<LeadTab, string> = {
  open: "open",
  won: "won",
  lost: "lost",
  all: "",
};

/** Refine options per tab — single-status tabs offer none. */
const TAB_REFINE: Record<LeadTab, readonly LeadStatus[]> = {
  open: OPEN_LEAD_STATUSES,
  won: [],
  lost: [],
  all: LEAD_STATUSES,
};

const COPY: Record<LeadTab, { emptyTitle: string; emptyDescription: string }> = {
  open: {
    emptyTitle: "No open leads",
    emptyDescription: "Sales enquiries your agent captures on calls will show up here.",
  },
  won: {
    emptyTitle: "No won leads yet",
    emptyDescription: "Leads that turn into work land here.",
  },
  lost: {
    emptyTitle: "Nothing lost",
    emptyDescription: "Leads that don't work out land here.",
  },
  all: {
    emptyTitle: "No leads yet",
    emptyDescription: "Log your first lead, or let your agent capture them from calls.",
  },
};

const NO_MATCH_COPY = {
  emptyTitle: "No leads match",
  emptyDescription: "Try a different search or clear some filters.",
};

/**
 * Master-detail shell mirroring the quotes page: list rail + detail pane on
 * one divider, with the pipeline stat strip above. Only the selected lead
 * lives in the URL (?lead=…); the tab and filters are page-local, so a deep
 * link lands on the default tab but the pane still renders any uuid.
 */
export function LeadsView() {
  const { business } = useBusiness();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("lead");

  const countsQuery = useLeadCounts(business.id);

  const [tab, setTab] = useState<LeadTab>("open");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<LeadFilterState>(EMPTY_LEAD_FILTERS);
  const [creating, setCreating] = useState(false);

  const q = useDebouncedValue(search, 400).trim();

  const apiFilters: ApiFilters = useMemo(() => {
    // A status refine narrows the tab's set to that single status.
    const status = filters.status !== "" ? filters.status : TAB_STATUSES[tab];
    return {
      ...(status !== "" ? { status } : {}),
      ...(filters.assignee_user_id !== ""
        ? { assignee_user_id: filters.assignee_user_id }
        : {}),
      ...(filters.sort !== "" ? { sort: filters.sort } : {}),
      ...(q !== "" ? { q } : {}),
    };
  }, [tab, q, filters]);

  const hasActiveFilters =
    q !== "" || filters.status !== "" || filters.assignee_user_id !== "";

  const select = (lead: Lead) =>
    router.replace(`${pathname}?lead=${lead.id}`, { scroll: false });
  const clearSelection = () => router.replace(pathname, { scroll: false });

  const changeTab = (next: LeadTab) => {
    setTab(next);
    // The status refine is tab-scoped; keep the search and other filters.
    setFilters((current) => ({ ...current, status: "" }));
  };

  const counts = countsQuery.data;
  const newLeadButton = (
    <Button onClick={() => setCreating(true)}>
      <PlusIcon />
      New lead
    </Button>
  );

  const copy = hasActiveFilters ? NO_MATCH_COPY : COPY[tab];

  return (
    <div className="flex flex-col gap-5 lg:min-h-0 lg:flex-1">
      <PageHeader
        title="Leads"
        description="Sales enquiries captured from calls or logged by your team, tracked to won or lost."
        actions={newLeadButton}
      />

      <LeadStatTiles counts={counts} className={cn(selectedId && "hidden lg:grid")} />

      <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
        <div
          className={cn(
            "min-h-0 flex-col gap-3 lg:flex lg:w-96 lg:shrink-0 lg:border-r lg:pr-5",
            selectedId ? "hidden" : "flex"
          )}
        >
          <Tabs value={tab} onValueChange={(value) => changeTab(value as LeadTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="open">
                Open
                {counts !== undefined && counts.open > 0 && (
                  <Badge variant="outline" className="h-5">
                    {counts.open}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="won">Won</TabsTrigger>
              <TabsTrigger value="lost">Lost</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          <LeadListFilters
            search={search}
            onSearchChange={setSearch}
            filters={filters}
            onFiltersChange={setFilters}
            statuses={TAB_REFINE[tab]}
          />

          <div className="scrollbar-slim min-h-0 flex-1 lg:overflow-y-auto lg:pr-1.5 lg:-mr-3">
            <LeadList
              businessUuid={business.id}
              filters={apiFilters}
              selectedId={selectedId}
              onSelect={select}
              emptyTitle={copy.emptyTitle}
              emptyDescription={copy.emptyDescription}
              emptyAction={hasActiveFilters ? undefined : newLeadButton}
            />
          </div>
        </div>

        <div
          // Keyed so switching leads starts the pane back at the top.
          key={selectedId ?? "empty"}
          className={cn(
            "min-h-0 min-w-0 flex-1 lg:pl-8",
            selectedId ? "flex" : "hidden lg:flex"
          )}
        >
          <LeadDetailPane
            businessUuid={business.id}
            leadUuid={selectedId}
            onBack={clearSelection}
            onClearSelection={clearSelection}
          />
        </div>
      </div>

      {creating && (
        <LeadFormDialog
          open
          onOpenChange={(next) => {
            if (!next) setCreating(false);
          }}
          onSaved={(lead) => {
            changeTab("open");
            select(lead);
          }}
        />
      )}
    </div>
  );
}
