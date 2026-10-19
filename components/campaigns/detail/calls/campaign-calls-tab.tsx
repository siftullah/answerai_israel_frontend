"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
const CAMPAIGN_CALL_STATUSES: CallStatus[] = [
  "queued",
  "initiating",
  "ringing",
  "in_progress",
  "completed",
  "busy",
  "no_answer",
  "failed",
  "canceled",
];

/** The campaign's slice of the call log — rows open the full call detail. */
export function CampaignCallsTab({ campaign }: { campaign: Campaign }) {
  const t = useTranslations("campaigns");
  const { business } = useBusiness();
  const router = useRouter();

  const statusItems = useMemo<{ value: StatusFilter; label: string }[]>(
    () => [
      { value: "all", label: t("filters.allStatuses") },
      ...CAMPAIGN_CALL_STATUSES.map((value) => ({ value, label: t(`calls.status.${value}`) })),
    ],
    [t]
  );

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
          placeholder={t("calls.searchPlaceholder")}
          className="w-full sm:w-64"
          autoComplete="off"
        />
        <Select
          items={statusItems}
          value={status}
          onValueChange={(value) => setStatus((value as StatusFilter | null) ?? "all")}
        >
          <SelectTrigger aria-label={t("calls.filterByStatus")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((item) => (
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
        emptyTitle={t("calls.emptyTitle")}
        emptyDescription={t("calls.emptyDescription")}
      />
    </div>
  );
}
