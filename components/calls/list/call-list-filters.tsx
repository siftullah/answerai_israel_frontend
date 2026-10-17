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
import type { Agent, CallDirection, CallStatus, PhoneNumber } from "@/lib/api/types";
import { formatE164 } from "@/lib/phone";

export type DatePreset = "" | "today" | "7d" | "30d";
export type SortOrder = "newest" | "oldest";

/** "" = not filtering on that dimension throughout. */
export interface CallFilterState {
  status: CallStatus | "";
  agentId: string;
  phoneNumberId: string;
  hasRecording: boolean;
  datePreset: DatePreset;
  sort: SortOrder;
}

export const EMPTY_CALL_FILTERS: CallFilterState = {
  status: "",
  agentId: "",
  phoneNumberId: "",
  hasRecording: false,
  datePreset: "",
  sort: "newest",
};

// Inbound rows are created post-call, so only these statuses ever occur there.
const INBOUND_STATUSES: readonly CallStatus[] = ["completed", "failed"];
const OUTBOUND_STATUSES: readonly CallStatus[] = [
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

const STATUS_LABELS: Record<CallStatus, string> = {
  queued: "Queued",
  initiating: "Initiating",
  ringing: "Ringing",
  in_progress: "In progress",
  completed: "Completed",
  busy: "Busy",
  no_answer: "No answer",
  failed: "Failed",
  canceled: "Canceled",
};

const DATE_LABELS: Record<Exclude<DatePreset, "">, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
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
  /** null = no "Any" option (for always-set values like sort). */
  anyLabel?: string | null;
}) {
  const items = anyLabel === null ? options : [{ value: "", label: anyLabel }, ...options];
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
 * Compact filter head for the list rail: debounced search input, a popover
 * with the structured filters + sort, and removable chips for whatever's active.
 */
export function CallListFilters({
  direction,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  agents,
  numbers,
}: {
  direction: CallDirection;
  search: string;
  onSearchChange: (value: string) => void;
  filters: CallFilterState;
  onFiltersChange: (filters: CallFilterState) => void;
  agents: Agent[] | undefined;
  numbers: PhoneNumber[] | undefined;
}) {
  const set = <K extends keyof CallFilterState>(key: K, value: CallFilterState[K]) =>
    onFiltersChange({ ...filters, [key]: value });

  const statuses = direction === "inbound" ? INBOUND_STATUSES : OUTBOUND_STATUSES;

  const chips: { key: keyof CallFilterState; label: string }[] = [];
  if (filters.status) chips.push({ key: "status", label: STATUS_LABELS[filters.status] });
  if (filters.agentId) {
    chips.push({
      key: "agentId",
      label: agents?.find((agent) => agent.id === filters.agentId)?.name ?? "Agent",
    });
  }
  if (filters.phoneNumberId) {
    chips.push({
      key: "phoneNumberId",
      label:
        numbers?.find((number) => number.id === filters.phoneNumberId)?.friendly_name ?? "Number",
    });
  }
  if (filters.hasRecording) chips.push({ key: "hasRecording", label: "Has recording" });
  if (filters.datePreset) chips.push({ key: "datePreset", label: DATE_LABELS[filters.datePreset] });
  if (filters.sort === "oldest") chips.push({ key: "sort", label: "Oldest first" });

  const clear = (key: keyof CallFilterState) =>
    onFiltersChange({ ...filters, [key]: EMPTY_CALL_FILTERS[key] } as CallFilterState);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search name, number or words said…"
          aria-label="Search calls by name, number, summary or transcript"
        />
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Filter and sort calls"
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
              id="call-filter-sort"
              label="Sort by date"
              value={filters.sort}
              anyLabel={null}
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
              ]}
              onChange={(value) => set("sort", (value || "newest") as SortOrder)}
            />
            <FilterSelect
              id="call-filter-status"
              label="Status"
              value={filters.status}
              options={statuses.map((status) => ({ value: status, label: STATUS_LABELS[status] }))}
              onChange={(value) => set("status", value as CallStatus | "")}
            />
            <FilterSelect
              id="call-filter-agent"
              label="Agent"
              value={filters.agentId}
              options={(agents ?? []).map((agent) => ({ value: agent.id, label: agent.name }))}
              onChange={(value) => set("agentId", value)}
            />
            <FilterSelect
              id="call-filter-number"
              label="Phone number"
              value={filters.phoneNumberId}
              options={(numbers ?? []).map((number) => ({
                value: number.id,
                label: number.friendly_name ?? formatE164(number.e164),
              }))}
              onChange={(value) => set("phoneNumberId", value)}
            />
            <FilterSelect
              id="call-filter-date"
              label="Period"
              value={filters.datePreset}
              options={(["today", "7d", "30d"] as const).map((preset) => ({
                value: preset,
                label: DATE_LABELS[preset],
              }))}
              onChange={(value) => set("datePreset", value as DatePreset)}
            />
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="call-filter-recording">Has recording</Label>
              <Switch
                id="call-filter-recording"
                checked={filters.hasRecording}
                onCheckedChange={(checked) => set("hasRecording", checked)}
              />
            </div>
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
            onClick={() => onFiltersChange(EMPTY_CALL_FILTERS)}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
