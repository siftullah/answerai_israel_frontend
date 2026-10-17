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
import type {
  AppointmentSource,
  AppointmentStatus,
  BusinessMember,
} from "@/lib/api/types";
import {
  APPOINTMENT_SOURCE_LABELS,
  APPOINTMENT_SOURCES,
  APPOINTMENT_STATUS_LABELS,
  UPCOMING_APPOINTMENT_STATUSES,
} from "@/lib/api/types";
import type { AppointmentTab } from "@/components/appointments/appointments-view";

const TERMINAL_STATUSES: readonly AppointmentStatus[] = ["completed", "canceled", "no_show"];

/** "" = not filtering on that dimension throughout. */
export interface AppointmentFilterState {
  source: AppointmentSource | "";
  /** Refines the tab's status set down to a single status. */
  status: AppointmentStatus | "";
  /** User uuid, or "unassigned" for the pool. */
  memberId: string;
}

export const EMPTY_APPOINTMENT_FILTERS: AppointmentFilterState = {
  source: "",
  status: "",
  memberId: "",
};

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
  anyLabel = "Any",
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  anyLabel?: string;
}) {
  const items = [{ value: "", label: anyLabel }, ...options];
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => onChange((next as string | null) ?? "")}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Filter head for the appointments rail: contact search, a popover of
 * structured filters (status options limited to the active tab's set),
 * removable chips.
 */
export function AppointmentListFilters({
  tab,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  members,
}: {
  tab: AppointmentTab;
  search: string;
  onSearchChange: (value: string) => void;
  filters: AppointmentFilterState;
  onFiltersChange: (filters: AppointmentFilterState) => void;
  members: BusinessMember[] | undefined;
}) {
  const set = <K extends keyof AppointmentFilterState>(
    key: K,
    value: AppointmentFilterState[K]
  ) => onFiltersChange({ ...filters, [key]: value });

  const statuses = tab === "history" ? TERMINAL_STATUSES : UPCOMING_APPOINTMENT_STATUSES;
  // Assignees must have a linked account — the assignee is the user uuid.
  const assignees = (members ?? []).filter((member) => member.has_account && member.user);
  const assigneeOptions = [
    { value: "unassigned", label: "Unassigned" },
    ...assignees.map((member) => ({ value: member.user?.id ?? "", label: member.name })),
  ];

  const chips: { key: keyof AppointmentFilterState; label: string }[] = [];
  if (filters.source) chips.push({ key: "source", label: APPOINTMENT_SOURCE_LABELS[filters.source] });
  if (filters.status) chips.push({ key: "status", label: APPOINTMENT_STATUS_LABELS[filters.status] });
  if (filters.memberId) {
    chips.push({
      key: "memberId",
      label:
        filters.memberId === "unassigned"
          ? "Unassigned"
          : (assignees.find((member) => member.user?.id === filters.memberId)?.name ?? "Assignee"),
    });
  }

  const clear = (key: keyof AppointmentFilterState) =>
    onFiltersChange({ ...filters, [key]: EMPTY_APPOINTMENT_FILTERS[key] } as AppointmentFilterState);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search contact…"
          aria-label="Search appointments by contact name"
        />
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Filter appointments"
                className="relative shrink-0"
              />
            }
          >
            <ListFilterIcon />
            {chips.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" />
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="flex w-72 flex-col gap-4">
            {tab !== "needs_review" && (
              <FilterSelect
                id="appointment-filter-status"
                label="Status"
                value={filters.status}
                options={statuses.map((status) => ({
                  value: status,
                  label: APPOINTMENT_STATUS_LABELS[status],
                }))}
                onChange={(value) => set("status", value as AppointmentStatus | "")}
              />
            )}
            <FilterSelect
              id="appointment-filter-source"
              label="Source"
              value={filters.source}
              options={APPOINTMENT_SOURCES.map((source) => ({
                value: source,
                label: APPOINTMENT_SOURCE_LABELS[source],
              }))}
              onChange={(value) => set("source", value as AppointmentSource | "")}
            />
            <FilterSelect
              id="appointment-filter-assignee"
              label="Assignee"
              value={filters.memberId}
              options={assigneeOptions}
              onChange={(value) => set("memberId", value)}
              anyLabel="Everyone"
            />
          </PopoverContent>
        </Popover>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <Badge key={chip.key} variant="outline" className="h-6 gap-1 pr-1">
              {chip.label}
              <button
                type="button"
                onClick={() => clear(chip.key)}
                aria-label={`Remove ${chip.label} filter`}
                className="rounded-full p-0.5 hover:bg-muted"
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => onFiltersChange(EMPTY_APPOINTMENT_FILTERS)}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
