"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CallList } from "@/components/calls/list/call-list";
import { useBusiness } from "@/components/business/business-provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { Campaign, CallListFilters, CallStatus } from "@/lib/api/types";

type StatusFilter = "all" | CallStatus;

// Only the statuses an outbound campaign call can land in.
const STATUS_ITEMS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "queued", label: "Queued" },
  { value: "initiating", label: "Initiating" },
  { value: "ringing", label: "Ringing" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "busy", label: "Busy" },
  { value: "no_answer", label: "No answer" },
  { value: "failed", label: "Failed" },
  { value: "canceled", label: "Canceled" },
];

/** The campaign's slice of the call log — rows open the full call detail. */
export function CampaignCallsTab({ campaign }: { campaign: Campaign }) {
  const { business } = useBusiness();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [status, setStatus] = useState<StatusFilter>("all");

  // direction is implied (campaign calls are all outbound) but sent anyway —
  // it's what the calls hook keys its live-poll check on.
  const filters = useMemo<CallListFilters>(
    () => ({
      campaign_id: campaign.id,
      direction: "outbound",
      ...(debouncedSearch !== "" ? { q: debouncedSearch } : {}),
      ...(status !== "all" ? { status } : {}),
    }),
    [campaign.id, debouncedSearch, status]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search number or caller"
          className="w-full sm:w-64"
          autoComplete="off"
        />
        <Select
          items={STATUS_ITEMS}
          value={status}
          onValueChange={(value) => setStatus((value as StatusFilter | null) ?? "all")}
        >
          <SelectTrigger aria-label="Filter by call status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CallList
        businessUuid={business.id}
        filters={filters}
        selectedId={null}
        onSelect={(call) => router.push(`/b/${business.id}/calls/${call.id}`)}
        emptyTitle="No calls yet"
        emptyDescription="Calls appear here as the campaign dials. Start the campaign to begin."
      />
    </div>
  );
}
