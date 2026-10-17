"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness } from "@/components/business/business-provider";
import { JobDetailPane } from "@/components/jobs/detail/job-detail-pane";
import { JobFormDialog } from "@/components/jobs/job-form-dialog";
import { JobStatTiles } from "@/components/jobs/job-stat-tiles";
import { JobList } from "@/components/jobs/list/job-list";
import {
  EMPTY_JOB_FILTERS,
  JobListFilters,
  type JobFilterState,
} from "@/components/jobs/list/job-list-filters";
import { useJobCounts } from "@/hooks/use-jobs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { Job, JobListFilters as ApiFilters, JobStatus } from "@/lib/api/types";
import { ACTIVE_JOB_STATUSES, JOB_STATUSES } from "@/lib/api/types";

export type JobTab = "active" | "unscheduled" | "completed" | "all";

/** Each tab's base status filter; "active" is a backend shorthand, "" = All. */
const TAB_STATUSES: Record<JobTab, string> = {
  active: "active",
  // "open" is the literal unscheduled status — the queue that needs booking.
  unscheduled: "open",
  completed: "completed",
  all: "",
};

/** Refine options per tab — single-status tabs offer none. */
const TAB_REFINE: Record<JobTab, readonly JobStatus[]> = {
  active: ACTIVE_JOB_STATUSES,
  unscheduled: [],
  completed: [],
  all: JOB_STATUSES,
};

const COPY: Record<JobTab, { emptyTitle: string; emptyDescription: string }> = {
  active: {
    emptyTitle: "No active jobs",
    emptyDescription: "Work your agent captures on calls, or that you log, shows up here.",
  },
  unscheduled: {
    emptyTitle: "Nothing to schedule",
    emptyDescription: "Every open job has a booked visit. New work lands here first.",
  },
  completed: {
    emptyTitle: "No completed jobs yet",
    emptyDescription: "Jobs you finish land here, ready to invoice.",
  },
  all: {
    emptyTitle: "No jobs yet",
    emptyDescription: "Log your first job, or let your agent capture them from calls.",
  },
};

const NO_MATCH_COPY = {
  emptyTitle: "No jobs match",
  emptyDescription: "Try a different search or clear some filters.",
};

/**
 * Master-detail shell mirroring the leads page: list rail + detail pane on
 * one divider, with the work stat strip above. Only the selected job lives in
 * the URL (?job=…); the tab and filters are page-local, so a deep link lands
 * on the default tab but the pane still renders any uuid.
 */
export function JobsView() {
  const { business } = useBusiness();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("job");

  const countsQuery = useJobCounts(business.id);

  const [tab, setTab] = useState<JobTab>("active");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<JobFilterState>(EMPTY_JOB_FILTERS);
  const [creating, setCreating] = useState(false);

  const q = useDebouncedValue(search, 400).trim();

  const apiFilters: ApiFilters = useMemo(() => {
    // A status refine narrows the tab's set to that single status.
    const status = filters.status !== "" ? filters.status : TAB_STATUSES[tab];
    return {
      ...(status !== "" ? { status } : {}),
      ...(filters.priority !== "" ? { priority: filters.priority } : {}),
      ...(filters.assignee_user_id !== ""
        ? { assignee_user_id: filters.assignee_user_id }
        : {}),
      ...(filters.sort !== "" ? { sort: filters.sort } : {}),
      ...(q !== "" ? { q } : {}),
    };
  }, [tab, q, filters]);

  const hasActiveFilters =
    q !== "" ||
    filters.status !== "" ||
    filters.priority !== "" ||
    filters.assignee_user_id !== "";

  const select = (job: Job) =>
    router.replace(`${pathname}?job=${job.id}`, { scroll: false });
  const clearSelection = () => router.replace(pathname, { scroll: false });

  const changeTab = (next: JobTab) => {
    setTab(next);
    // The status refine is tab-scoped; keep the search and other filters.
    setFilters((current) => ({ ...current, status: "" }));
  };

  const counts = countsQuery.data;
  const newJobButton = (
    <Button onClick={() => setCreating(true)}>
      <PlusIcon />
      New job
    </Button>
  );

  const copy = hasActiveFilters ? NO_MATCH_COPY : COPY[tab];

  return (
    <div className="flex flex-col gap-5 lg:min-h-0 lg:flex-1">
      <PageHeader
        title="Jobs"
        description="Work captured from calls or logged by your team — scheduled, delivered, and invoiced."
        actions={newJobButton}
      />

      <JobStatTiles counts={counts} className={cn(selectedId && "hidden lg:grid")} />

      <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
        <div
          className={cn(
            "min-h-0 flex-col gap-3 lg:flex lg:w-96 lg:shrink-0 lg:border-r lg:pr-5",
            selectedId ? "hidden" : "flex"
          )}
        >
          <Tabs value={tab} onValueChange={(value) => changeTab(value as JobTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="active">
                Active
                {counts !== undefined && counts.active > 0 && (
                  <Badge variant="outline" className="h-5">
                    {counts.active}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unscheduled">
                To schedule
                {counts !== undefined && counts.open > 0 && (
                  <Badge variant="warning" className="h-5">
                    {counts.open}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed">Done</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          <JobListFilters
            search={search}
            onSearchChange={setSearch}
            filters={filters}
            onFiltersChange={setFilters}
            statuses={TAB_REFINE[tab]}
          />

          <div className="scrollbar-slim min-h-0 flex-1 lg:overflow-y-auto lg:pr-1.5 lg:-mr-3">
            <JobList
              businessUuid={business.id}
              filters={apiFilters}
              selectedId={selectedId}
              onSelect={select}
              emptyTitle={copy.emptyTitle}
              emptyDescription={copy.emptyDescription}
              emptyAction={hasActiveFilters ? undefined : newJobButton}
            />
          </div>
        </div>

        <div
          // Keyed so switching jobs starts the pane back at the top.
          key={selectedId ?? "empty"}
          className={cn(
            "min-h-0 min-w-0 flex-1 lg:pl-8",
            selectedId ? "flex" : "hidden lg:flex"
          )}
        >
          <JobDetailPane
            businessUuid={business.id}
            jobUuid={selectedId}
            onBack={clearSelection}
            onClearSelection={clearSelection}
          />
        </div>
      </div>

      {creating && (
        <JobFormDialog
          open
          onOpenChange={(next) => {
            if (!next) setCreating(false);
          }}
          onSaved={(job) => {
            changeTab("active");
            select(job);
          }}
        />
      )}
    </div>
  );
}
