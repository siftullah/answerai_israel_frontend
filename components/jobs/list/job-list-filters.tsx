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
import type { JobPriority, JobStatus } from "@/lib/api/types";
import { JOB_PRIORITY_LABELS, JOB_STATUS_LABELS } from "@/lib/api/types";

/** "" = not filtering on that dimension. */
export interface JobFilterState {
  /** Refines the tab's status set down to a single status. */
  status: JobStatus | "";
  priority: JobPriority | "";
  assignee_user_id: string;
  /** "" = newest first. */
  sort: "" | "scheduled_start" | "quote";
}

export const EMPTY_JOB_FILTERS: JobFilterState = {
  status: "",
  priority: "",
  assignee_user_id: "",
  sort: "",
};

/**
 * Filter head for the jobs rail: search plus a popover of status refine
 * (limited to the active tab's set), priority, assignee, and sort order.
 */
export function JobListFilters({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  statuses,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filters: JobFilterState;
  onFiltersChange: (filters: JobFilterState) => void;
  /** Refine options for the active tab; empty hides the status select. */
  statuses: readonly JobStatus[];
}) {
  const t = useTranslations("jobs");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const membersQuery = useMembers(business.id);

  const assignees = (membersQuery.data ?? []).filter(
    (member) => member.has_account && member.user
  );
  const assigneeName = (userId: string) =>
    assignees.find((member) => member.user?.id === userId)?.name ?? t("fields.assignee");

  const sortLabels: Record<Exclude<JobFilterState["sort"], "">, string> = {
    scheduled_start: t("filters.sortOptions.scheduled_start"),
    quote: t("filters.sortOptions.quote"),
  };
  const sortItems = [
    { value: "", label: t("filters.sortOptions.newest") },
    { value: "scheduled_start", label: sortLabels.scheduled_start },
    { value: "quote", label: sortLabels.quote },
  ];
  const priorityItems = [
    { value: "", label: t("filters.anyPriority") },
    ...(["high", "normal", "low"] as const).map((priority) => ({
      value: priority,
      label: JOB_PRIORITY_LABELS[priority],
    })),
  ];
  const statusItems = [
    { value: "", label: t("filters.anyStatus") },
    ...statuses.map((status) => ({ value: status, label: JOB_STATUS_LABELS[status] })),
  ];
  const assigneeItems = [
    { value: "", label: t("filters.anyone") },
    ...assignees.map((member) => ({ value: member.user?.id ?? "", label: member.name })),
  ];

  const active =
    filters.status !== "" ||
    filters.priority !== "" ||
    filters.assignee_user_id !== "" ||
    filters.sort !== "";

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
                <Label htmlFor="job-filter-status">{tc("labels.status")}</Label>
                <Select
                  items={statusItems}
                  value={filters.status}
                  onValueChange={(next) =>
                    onFiltersChange({ ...filters, status: (next as JobStatus | null) ?? "" })
                  }
                >
                  <SelectTrigger id="job-filter-status" className="w-full">
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
              <Label htmlFor="job-filter-priority">{t("fields.priority")}</Label>
              <Select
                items={priorityItems}
                value={filters.priority}
                onValueChange={(next) =>
                  onFiltersChange({ ...filters, priority: (next as JobPriority | null) ?? "" })
                }
              >
                <SelectTrigger id="job-filter-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="job-filter-assignee">{t("fields.assignee")}</Label>
              <Select
                items={assigneeItems}
                value={filters.assignee_user_id}
                onValueChange={(next) =>
                  onFiltersChange({ ...filters, assignee_user_id: (next as string | null) ?? "" })
                }
              >
                <SelectTrigger id="job-filter-assignee" className="w-full">
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
              <Label htmlFor="job-filter-sort">{t("filters.sort")}</Label>
              <Select
                items={sortItems}
                value={filters.sort}
                onValueChange={(next) =>
                  onFiltersChange({
                    ...filters,
                    sort: (next as JobFilterState["sort"] | null) ?? "",
                  })
                }
              >
                <SelectTrigger id="job-filter-sort" className="w-full">
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
              label={JOB_STATUS_LABELS[filters.status]}
              onRemove={() => onFiltersChange({ ...filters, status: "" })}
            />
          )}
          {filters.priority !== "" && (
            <FilterChip
              label={t("filters.priorityChip", {
                priority: JOB_PRIORITY_LABELS[filters.priority],
              })}
              onRemove={() => onFiltersChange({ ...filters, priority: "" })}
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
  const t = useTranslations("jobs.filters");
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
