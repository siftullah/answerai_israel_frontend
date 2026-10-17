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
import { Switch } from "@/components/ui/switch";
import type {
  Agent,
  BusinessMember,
  CallbackSource,
  CallbackStatus,
  CallbackType,
} from "@/lib/api/types";
import {
  CALLBACK_SOURCE_LABELS,
  CALLBACK_SOURCES,
  CALLBACK_STATUS_LABELS,
  CALLBACK_TYPE_LABELS,
  CALLBACK_TYPES,
  OPEN_CALLBACK_STATUSES,
  TERMINAL_CALLBACK_STATUSES,
} from "@/lib/api/types";
import type { CallbackTab } from "@/components/callbacks/callbacks-view";

/** "" = not filtering on that dimension throughout. */
export interface CallbackFilterState {
  type: CallbackType | "";
  source: CallbackSource | "";
  /** Refines the tab's status set down to a single status. */
  status: CallbackStatus | "";
  agentId: string;
  assigneeUserId: string;
  overdueOnly: boolean;
}

export const EMPTY_CALLBACK_FILTERS: CallbackFilterState = {
  type: "",
  source: "",
  status: "",
  agentId: "",
  assigneeUserId: "",
  overdueOnly: false,
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
 * Filter head for the callbacks rail: search, a popover of structured
 * filters (status options limited to the active tab's set), removable chips.
 */
export function CallbackListFilters({
  tab,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  agents,
  members,
}: {
  tab: CallbackTab;
  search: string;
  onSearchChange: (value: string) => void;
  filters: CallbackFilterState;
  onFiltersChange: (filters: CallbackFilterState) => void;
  agents: Agent[] | undefined;
  members: BusinessMember[] | undefined;
}) {
  const set = <K extends keyof CallbackFilterState>(key: K, value: CallbackFilterState[K]) =>
    onFiltersChange({ ...filters, [key]: value });

  const statuses = tab === "history" ? TERMINAL_CALLBACK_STATUSES : OPEN_CALLBACK_STATUSES;
  // Assignees must have a linked account — assignee_user_id is the user uuid.
  const assignees = (members ?? []).filter((member) => member.has_account && member.user);

  const chips: { key: keyof CallbackFilterState; label: string }[] = [];
  if (filters.type) chips.push({ key: "type", label: CALLBACK_TYPE_LABELS[filters.type] });
  if (filters.source) chips.push({ key: "source", label: CALLBACK_SOURCE_LABELS[filters.source] });
  if (filters.status) chips.push({ key: "status", label: CALLBACK_STATUS_LABELS[filters.status] });
  if (filters.agentId) {
    chips.push({
      key: "agentId",
      label: agents?.find((agent) => agent.id === filters.agentId)?.name ?? "Agent",
    });
  }
  if (filters.assigneeUserId) {
    chips.push({
      key: "assigneeUserId",
      label:
        assignees.find((member) => member.user?.id === filters.assigneeUserId)?.name ?? "Assignee",
    });
  }
  if (filters.overdueOnly) chips.push({ key: "overdueOnly", label: "Overdue only" });

  const clear = (key: keyof CallbackFilterState) =>
    onFiltersChange({ ...filters, [key]: EMPTY_CALLBACK_FILTERS[key] } as CallbackFilterState);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search topic or number…"
          aria-label="Search callbacks by topic or phone number"
        />
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Filter callbacks"
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
            <FilterSelect
              id="callback-filter-type"
              label="Type"
              value={filters.type}
              options={CALLBACK_TYPES.map((type) => ({
                value: type,
                label: CALLBACK_TYPE_LABELS[type],
              }))}
              onChange={(value) => set("type", value as CallbackType | "")}
            />
            <FilterSelect
              id="callback-filter-status"
              label="Status"
              value={filters.status}
              options={statuses.map((status) => ({
                value: status,
                label: CALLBACK_STATUS_LABELS[status],
              }))}
              onChange={(value) => set("status", value as CallbackStatus | "")}
            />
            <FilterSelect
              id="callback-filter-source"
              label="Source"
              value={filters.source}
              options={CALLBACK_SOURCES.map((source) => ({
                value: source,
                label: CALLBACK_SOURCE_LABELS[source],
              }))}
              onChange={(value) => set("source", value as CallbackSource | "")}
            />
            <FilterSelect
              id="callback-filter-agent"
              label="Agent"
              value={filters.agentId}
              options={(agents ?? []).map((agent) => ({ value: agent.id, label: agent.name }))}
              onChange={(value) => set("agentId", value)}
            />
            <FilterSelect
              id="callback-filter-assignee"
              label="Assignee"
              value={filters.assigneeUserId}
              options={assignees.map((member) => ({
                value: member.user?.id ?? "",
                label: member.name,
              }))}
              onChange={(value) => set("assigneeUserId", value)}
            />
            {tab === "open" && (
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="callback-filter-overdue">Overdue only</Label>
                <Switch
                  id="callback-filter-overdue"
                  checked={filters.overdueOnly}
                  onCheckedChange={(checked) => set("overdueOnly", checked)}
                />
              </div>
            )}
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
            onClick={() => onFiltersChange(EMPTY_CALLBACK_FILTERS)}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
