"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness } from "@/components/business/business-provider";
import { CreateCallbackDialog } from "@/components/callbacks/create-callback-dialog";
import { CallbackDetailPane } from "@/components/callbacks/detail/callback-detail-pane";
import { CallbackList } from "@/components/callbacks/list/callback-list";
import {
  CallbackListFilters,
  EMPTY_CALLBACK_FILTERS,
  type CallbackFilterState,
} from "@/components/callbacks/list/callback-list-filters";
import { useAgents } from "@/hooks/use-agents";
import { useCallbackCounts } from "@/hooks/use-callbacks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useMembers } from "@/hooks/use-members";
import { businessDayUtcRange } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { Callback, CallbackListFilters as ApiFilters } from "@/lib/api/types";
import { OPEN_CALLBACK_STATUSES, TERMINAL_CALLBACK_STATUSES } from "@/lib/api/types";

export type CallbackTab = "open" | "due_today" | "history";

const OPEN_STATUSES = OPEN_CALLBACK_STATUSES.join(",");
const TERMINAL_STATUSES = TERMINAL_CALLBACK_STATUSES.join(",");

const COPY: Record<CallbackTab, { emptyTitle: string; emptyDescription: string }> = {
  open: {
    emptyTitle: "No open callbacks",
    emptyDescription:
      "Call-backs your agents promise to callers — and ones you schedule yourself — will show up here.",
  },
  due_today: {
    emptyTitle: "Nothing due today",
    emptyDescription: "Open callbacks scheduled for today will appear here.",
  },
  history: {
    emptyTitle: "No callback history yet",
    emptyDescription: "Completed, missed and canceled callbacks land here.",
  },
};

const NO_MATCH_COPY = {
  emptyTitle: "No callbacks match",
  emptyDescription: "Try a different search or clear some filters.",
};

/**
 * Master-detail shell mirroring the call logs: list rail + detail pane on one
 * divider. Only the selected callback lives in the URL (?callback=…); the tab
 * and filters are page-local, so a deep link lands on the default tab but the
 * pane still renders any uuid.
 */
export function CallbacksView() {
  const { business } = useBusiness();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("callback");

  const agentsQuery = useAgents(business.id);
  const membersQuery = useMembers(business.id);
  const countsQuery = useCallbackCounts(business.id);

  const [tab, setTab] = useState<CallbackTab>("open");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CallbackFilterState>(EMPTY_CALLBACK_FILTERS);
  const [creating, setCreating] = useState(false);

  const q = useDebouncedValue(search, 400).trim();

  // Recomputed whenever the tab activates, so a page left open across
  // midnight self-corrects on the next switch.
  const todayRange = useMemo(
    () => (tab === "due_today" ? businessDayUtcRange(business.timezone) : null),
    [tab, business.timezone]
  );

  const apiFilters: ApiFilters = useMemo(() => {
    // A status refine narrows the tab's set to that single status.
    const status =
      filters.status !== ""
        ? filters.status
        : tab === "history"
          ? TERMINAL_STATUSES
          : OPEN_STATUSES;
    return {
      status,
      ...(tab === "history" ? { sort: "newest" as const } : {}),
      ...(todayRange
        ? { scheduled_after: todayRange.startIso, scheduled_before: todayRange.endIso }
        : {}),
      ...(q !== "" ? { q } : {}),
      ...(filters.type !== "" ? { type: filters.type } : {}),
      ...(filters.source !== "" ? { source: filters.source } : {}),
      ...(filters.agentId !== "" ? { agent_id: filters.agentId } : {}),
      ...(filters.assigneeUserId !== "" ? { assignee_user_id: filters.assigneeUserId } : {}),
      ...(tab === "open" && filters.overdueOnly ? { overdue: true } : {}),
    };
  }, [tab, todayRange, q, filters]);

  const hasActiveFilters =
    q !== "" ||
    filters.type !== "" ||
    filters.source !== "" ||
    filters.status !== "" ||
    filters.agentId !== "" ||
    filters.assigneeUserId !== "" ||
    filters.overdueOnly;

  const select = (callback: Callback) =>
    router.replace(`${pathname}?callback=${callback.id}`, { scroll: false });
  const clearSelection = () => router.replace(pathname, { scroll: false });

  const changeTab = (next: CallbackTab) => {
    setTab(next);
    // The status refine and overdue toggle are tab-scoped; keep the rest.
    setFilters((current) => ({ ...current, status: "", overdueOnly: false }));
  };

  const counts = countsQuery.data;
  const newCallbackButton = (
    <Button onClick={() => setCreating(true)}>
      <PlusIcon />
      New callback
    </Button>
  );

  const copy = hasActiveFilters ? NO_MATCH_COPY : COPY[tab];

  return (
    <div className="flex flex-col gap-5 lg:min-h-0 lg:flex-1">
      <PageHeader
        title="Callbacks"
        description="Call-backs promised to callers — dialed by your agents or handled by your team."
        actions={newCallbackButton}
      />

      <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
        <div
          className={cn(
            "min-h-0 flex-col gap-3 lg:flex lg:w-96 lg:shrink-0 lg:border-r lg:pr-5",
            selectedId ? "hidden" : "flex"
          )}
        >
          <Tabs value={tab} onValueChange={(value) => changeTab(value as CallbackTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="open">
                Open
                {counts !== undefined && counts.open > 0 && (
                  <Badge variant={counts.overdue > 0 ? "warning" : "outline"} className="h-5">
                    {counts.open}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="due_today">
                Due today
                {counts !== undefined && counts.due_today > 0 && (
                  <Badge variant="outline" className="h-5">
                    {counts.due_today}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </Tabs>

          <CallbackListFilters
            tab={tab}
            search={search}
            onSearchChange={setSearch}
            filters={filters}
            onFiltersChange={setFilters}
            agents={agentsQuery.data}
            members={membersQuery.data}
          />

          <div className="scrollbar-slim min-h-0 flex-1 lg:overflow-y-auto lg:pr-1.5 lg:-mr-3">
            <CallbackList
              businessUuid={business.id}
              filters={apiFilters}
              selectedId={selectedId}
              onSelect={select}
              emptyTitle={copy.emptyTitle}
              emptyDescription={copy.emptyDescription}
              emptyAction={hasActiveFilters ? undefined : newCallbackButton}
            />
          </div>
        </div>

        <div
          // Keyed so switching callbacks starts the pane back at the top.
          key={selectedId ?? "empty"}
          className={cn(
            "min-h-0 min-w-0 flex-1 lg:pl-8",
            selectedId ? "flex" : "hidden lg:flex"
          )}
        >
          <CallbackDetailPane
            businessUuid={business.id}
            callbackUuid={selectedId}
            onBack={clearSelection}
            onClearSelection={clearSelection}
          />
        </div>
      </div>

      {creating && (
        <CreateCallbackDialog
          open
          onOpenChange={(next) => {
            if (!next) setCreating(false);
          }}
          onCreated={(callback) => {
            changeTab("open");
            select(callback);
          }}
        />
      )}
    </div>
  );
}
