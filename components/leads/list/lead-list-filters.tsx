"use client";

import { useTranslations } from "next-intl";
import { ListFilterIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBusiness } from "@/components/business/business-provider";
import { useMembers } from "@/hooks/use-members";
import type { LeadStatus } from "@/lib/api/types";
import { LEAD_STATUS_LABELS } from "@/lib/api/types";

/** "" = not filtering on that dimension. */
export interface LeadFilterState {
  /** Refines the tab's status set down to a single status. */
  status: LeadStatus | "";
  assignee_user_id: string;
  /** "" = newest first. */
  sort: "" | "value" | "expected_close_date";
}

export const EMPTY_LEAD_FILTERS: LeadFilterState = {
  status: "",
  assignee_user_id: "",
  sort: "",
};

/**
 * Filter head for the leads rail: search plus a popover of status refine
 * (limited to the active tab's set), assignee, and sort order.
 */
export function LeadListFilters({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  statuses,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filters: LeadFilterState;
  onFiltersChange: (filters: LeadFilterState) => void;
  /** Refine options for the active tab; empty hides the status select. */
  statuses: readonly LeadStatus[];
}) {
  const t = useTranslations("leads");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const membersQuery = useMembers(business.id);

  const sortLabels: Record<Exclude<LeadFilterState["sort"], "">, string> = {
    value: t("filters.highestValue"),
    expected_close_date: t("filters.closingSoonest"),
  };
  const sortItems = [
    { value: "", label: t("filters.newestFirst") },
    { value: "value", label: sortLabels.value },
    { value: "expected_close_date", label: sortLabels.expected_close_date },
  ];

  const assignees = (membersQuery.data ?? []).filter(
    (member) => member.has_account && member.user
  );
  const assigneeName = (userId: string) =>
    assignees.find((member) => member.user?.id === userId)?.name ?? t("fields.assignee");

  const statusItems = [
    { value: "", label: t("filters.anyStatus") },
    ...statuses.map((status) => ({ value: status, label: LEAD_STATUS_LABELS[status] })),
  ];
  const assigneeItems = [
    { value: "", label: t("filters.anyone") },
    ...assignees.map((member) => ({ value: member.user?.id ?? "", label: member.name })),
  ];

  const active =
    filters.status !== "" || filters.assignee_user_id !== "" || filters.sort !== "";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("filters.searchPlaceholder")}
          aria-label={t("filters.searchLabel")}
        />
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label={t("filters.filterLabel")}
                className="relative shrink-0"
              />
            }
          >
            <ListFilterIcon />
            {active && (
              <span className="absolute -top-0.5 -end-0.5 size-2 rounded-full bg-primary" />
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="flex w-64 flex-col gap-3">
            {statuses.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lead-filter-status">{tc("labels.status")}</Label>
                <Select
                  items={statusItems}
                  value={filters.status}
                  onValueChange={(next) =>
                    onFiltersChange({ ...filters, status: (next as LeadStatus | null) ?? "" })
                  }
                >
                  <SelectTrigger id="lead-filter-status" className="w-full">
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
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-filter-assignee">{t("fields.assignee")}</Label>
              <Select
                items={assigneeItems}
                value={filters.assignee_user_id}
                onValueChange={(next) =>
                  onFiltersChange({ ...filters, assignee_user_id: (next as string | null) ?? "" })
                }
              >
                <SelectTrigger id="lead-filter-assignee" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assigneeItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-filter-sort">{t("filters.sort")}</Label>
              <Select
                items={sortItems}
                value={filters.sort}
                onValueChange={(next) =>
                  onFiltersChange({
                    ...filters,
                    sort: (next as LeadFilterState["sort"] | null) ?? "",
                  })
                }
              >
                <SelectTrigger id="lead-filter-sort" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {active && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.status !== "" && (
            <FilterChip
              label={LEAD_STATUS_LABELS[filters.status]}
              onRemove={() => onFiltersChange({ ...filters, status: "" })}
            />
          )}
          {filters.assignee_user_id !== "" && (
            <FilterChip
              label={assigneeName(filters.assignee_user_id)}
              onRemove={() => onFiltersChange({ ...filters, assignee_user_id: "" })}
            />
          )}
          {filters.sort !== "" && (
            <FilterChip
              label={sortLabels[filters.sort]}
              onRemove={() => onFiltersChange({ ...filters, sort: "" })}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const t = useTranslations("leads.filters");

  return (
    <Badge variant="outline" className="h-6 gap-1 pe-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("removeFilter", { label })}
        className="rounded-full p-0.5 hover:bg-muted"
      >
        <XIcon className="size-3" />
      </button>
    </Badge>
  );
}
