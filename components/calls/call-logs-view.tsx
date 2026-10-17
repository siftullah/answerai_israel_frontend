"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness } from "@/components/business/business-provider";
import { CallDetailPane } from "@/components/calls/detail/call-detail-pane";
import { CallList } from "@/components/calls/list/call-list";
import {
  CallListFilters,
  EMPTY_CALL_FILTERS,
  type CallFilterState,
  type DatePreset,
} from "@/components/calls/list/call-list-filters";
import { PlaceCallDialog } from "@/components/calls/place-call-dialog";
import { useAgents } from "@/hooks/use-agents";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePhoneNumbers } from "@/hooks/use-phone-numbers";
import { cn } from "@/lib/utils";
import type { Call, CallDirection, CallListFilters as ApiFilters } from "@/lib/api/types";

const COPY: Record<
  CallDirection,
  { title: string; description: string; emptyTitle: string; emptyDescription: string }
> = {
  inbound: {
    title: "Inbound logs",
    description: "Every call your agents answered — transcripts, recordings and outcomes.",
    emptyTitle: "No inbound calls yet",
    emptyDescription:
      "Once a caller reaches one of your numbers, the call lands here.",
  },
  outbound: {
    title: "Outbound logs",
    description: "Calls your agents placed — one-off, campaign and callback calls.",
    emptyTitle: "No outbound calls yet",
    emptyDescription: "Place a call and your agent will dial and handle the conversation.",
  },
};

function presetToCreatedAfter(preset: DatePreset): string | undefined {
  if (preset === "") return undefined;
  const now = new Date();
  if (preset === "today") {
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  now.setDate(now.getDate() - (preset === "7d" ? 7 : 30));
  return now.toISOString();
}

/**
 * Master-detail shell shared by both log pages: an inbox split — list rail
 * and detail pane flush against a single divider, each scrolling internally
 * so neither ever trails empty space. Only the selected call lives in the URL
 * (?call=…); filters are page-local. Below lg the panes collapse into one —
 * the selection decides which is visible.
 */
export function CallLogsView({ direction }: { direction: CallDirection }) {
  const { business } = useBusiness();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("call");

  const agentsQuery = useAgents(business.id);
  const numbersQuery = usePhoneNumbers(business.id);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CallFilterState>(EMPTY_CALL_FILTERS);
  const [placing, setPlacing] = useState(false);

  // The transcript LIKE search is the heavy one — debounce well past typing speed.
  const q = useDebouncedValue(search, 400).trim();

  const createdAfter = useMemo(() => presetToCreatedAfter(filters.datePreset), [filters.datePreset]);

  const apiFilters: ApiFilters = useMemo(
    () => ({
      direction,
      ...(q !== "" ? { q } : {}),
      ...(filters.sort === "oldest" ? { sort: "oldest" as const } : {}),
      ...(filters.status !== "" ? { status: filters.status } : {}),
      ...(filters.agentId !== "" ? { agent_id: filters.agentId } : {}),
      ...(filters.phoneNumberId !== "" ? { phone_number_id: filters.phoneNumberId } : {}),
      ...(filters.hasRecording ? { has_recording: true } : {}),
      ...(createdAfter ? { created_after: createdAfter } : {}),
    }),
    [direction, q, filters, createdAfter]
  );

  const select = (call: Call) =>
    router.replace(`${pathname}?call=${call.id}`, { scroll: false });
  const clearSelection = () => router.replace(pathname, { scroll: false });

  const placeCallButton =
    direction === "outbound" ? (
      <Button onClick={() => setPlacing(true)}>
        <PlusIcon />
        Place call
      </Button>
    ) : undefined;

  return (
    // lg-only height locking: at lg the shell's bounded height flows down and
    // the panes scroll internally; below lg the shell scrolls naturally.
    <div className="flex flex-col gap-5 lg:min-h-0 lg:flex-1">
      <PageHeader
        title={COPY[direction].title}
        description={COPY[direction].description}
        actions={placeCallButton}
      />

      {/* The split: flush columns, one divider, each pane scrolls itself. */}
      <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
        <div
          className={cn(
            "min-h-0 flex-col gap-3 lg:flex lg:w-96 lg:shrink-0 lg:border-r lg:pr-5",
            selectedId ? "hidden" : "flex"
          )}
        >
          <CallListFilters
            direction={direction}
            search={search}
            onSearchChange={setSearch}
            filters={filters}
            onFiltersChange={setFilters}
            agents={agentsQuery.data}
            numbers={numbersQuery.data}
          />
          <div className="scrollbar-slim min-h-0 flex-1 lg:overflow-y-auto lg:pr-1.5 lg:-mr-3">
            <CallList
              businessUuid={business.id}
              filters={apiFilters}
              selectedId={selectedId}
              onSelect={select}
              emptyTitle={COPY[direction].emptyTitle}
              emptyDescription={COPY[direction].emptyDescription}
              emptyAction={placeCallButton}
            />
          </div>
        </div>

        <div
          // Keyed so switching calls starts the pane back at the top. The
          // pane scrolls its own tab panels, so no overflow here.
          key={selectedId ?? "empty"}
          className={cn(
            "min-h-0 min-w-0 flex-1 lg:pl-8",
            selectedId ? "flex" : "hidden lg:flex"
          )}
        >
          <CallDetailPane
            businessUuid={business.id}
            callUuid={selectedId}
            onBack={clearSelection}
            onClearSelection={clearSelection}
          />
        </div>
      </div>

      {direction === "outbound" && (
        <PlaceCallDialog open={placing} onOpenChange={setPlacing} onPlaced={select} />
      )}
    </div>
  );
}
