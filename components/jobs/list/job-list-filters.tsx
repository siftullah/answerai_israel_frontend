"use client";

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

const SORT_LABELS: Record<Exclude<JobFilterState["sort"], "">, string> = {
  scheduled_start: "Soonest visit",
  quote: "Highest value",
};

const SORT_ITEMS = [
  { value: "", label: "Newest first" },
  { value: "scheduled_start", label: SORT_LABELS.scheduled_start },
  { value: "quote", label: SORT_LABELS.quote },
];

const PRIORITY_ITEMS = [
  { value: "", label: "Any priority" },
  ...(["high", "normal", "low"] as const).map((priority) => ({
    value: priority,
    label: JOB_PRIORITY_LABELS[priority],
  })),
];

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
  const { business } = useBusiness();
  const membersQuery = useMembers(business.id);

  const assignees = (membersQuery.data ?? []).filter(
    (member) => member.has_account && member.user
  );
  const assigneeName = (userId: string) =>
    assignees.find((member) => member.user?.id === userId)?.name ?? "Assignee";

  const statusItems = [
    { value: "", label: "Any status" },
    ...statuses.map((status) => ({ value: status, label: JOB_STATUS_LABELS[status] })),
  ];
  const assigneeItems = [
    { value: "", label: "Anyone" },
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
          placeholder="Search title or contact…"
          aria-label="Search jobs by title or contact name"
        />
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Filter jobs"
                className="relative shrink-0"
              />
            }
          >
            <ListFilterIcon />
            {active && (
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" />
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="flex w-64 flex-col gap-3">
            {statuses.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="job-filter-status">Status</Label>
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
              <Label htmlFor="job-filter-priority">Priority</Label>
              <Select
                items={PRIORITY_ITEMS}
                value={filters.priority}
                onValueChange={(next) =>
                  onFiltersChange({ ...filters, priority: (next as JobPriority | null) ?? "" })
                }
              >
                <SelectTrigger id="job-filter-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="job-filter-assignee">Assignee</Label>
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
              <Label htmlFor="job-filter-sort">Sort</Label>
              <Select
                items={SORT_ITEMS}
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
                  {SORT_ITEMS.map((item) => (
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
              label={`${JOB_PRIORITY_LABELS[filters.priority]} priority`}
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
              label={SORT_LABELS[filters.sort]}
              onRemove={() => onFiltersChange({ ...filters, sort: "" })}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="outline" className="h-6 gap-1 pr-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="rounded-full p-0.5 hover:bg-muted"
      >
        <XIcon className="size-3" />
      </button>
    </Badge>
  );
}
