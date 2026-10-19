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
import { Switch } from "@/components/ui/switch";
import { useCallStatusLabels } from "@/components/calls/call-status-badge";
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
  "voicemail",
  "busy",
  "no_answer",
  "failed",
  "canceled",
];

const DATE_PRESETS = ["today", "7d", "30d"] as const;

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
  anyLabel,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  /** Omit for the default "Any"; null = no "Any" option (for always-set values like sort). */
  anyLabel?: string | null;
}) {
  const t = useTranslations("calls.filters");
  const items =
    anyLabel === null ? options : [{ value: "", label: anyLabel ?? t("any") }, ...options];
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
  const t = useTranslations("calls");
  const tc = useTranslations("common");
  const statusLabels = useCallStatusLabels();
  const dateLabel = (preset: Exclude<DatePreset, "">) =>
    preset === "today"
      ? t("filters.today")
      : t("filters.lastDays", { count: preset === "7d" ? 7 : 30 });

  const set = <K extends keyof CallFilterState>(key: K, value: CallFilterState[K]) =>
    onFiltersChange({ ...filters, [key]: value });

  const statuses = direction === "inbound" ? INBOUND_STATUSES : OUTBOUND_STATUSES;

  const chips: { key: keyof CallFilterState; label: string }[] = [];
  if (filters.status) chips.push({ key: "status", label: statusLabels[filters.status] });
  if (filters.agentId) {
    chips.push({
      key: "agentId",
      label: agents?.find((agent) => agent.id === filters.agentId)?.name ?? t("labels.agent"),
    });
  }
  if (filters.phoneNumberId) {
    chips.push({
      key: "phoneNumberId",
      label:
        numbers?.find((number) => number.id === filters.phoneNumberId)?.friendly_name ??
        t("filters.numberFallback"),
    });
  }
  if (filters.hasRecording) chips.push({ key: "hasRecording", label: t("filters.hasRecording") });
  if (filters.datePreset) chips.push({ key: "datePreset", label: dateLabel(filters.datePreset) });
  if (filters.sort === "oldest") chips.push({ key: "sort", label: t("filters.oldestFirst") });

  const clear = (key: keyof CallFilterState) =>
    onFiltersChange({ ...filters, [key]: EMPTY_CALL_FILTERS[key] } as CallFilterState);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("filters.searchPlaceholder")}
          aria-label={t("filters.searchAriaLabel")}
        />
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label={t("filters.filterAriaLabel")}
                className="relative shrink-0"
              />
            }
          >
            <ListFilterIcon />
            {chips.length > 0 && (
              <span className="absolute -top-0.5 -end-0.5 size-2 rounded-full bg-primary" />
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="flex w-72 flex-col gap-4">
            <FilterSelect
              id="call-filter-sort"
              label={t("filters.sortByDate")}
              value={filters.sort}
              anyLabel={null}
              options={[
                { value: "newest", label: t("filters.newestFirst") },
                { value: "oldest", label: t("filters.oldestFirst") },
              ]}
              onChange={(value) => set("sort", (value || "newest") as SortOrder)}
            />
            <FilterSelect
              id="call-filter-status"
              label={tc("labels.status")}
              value={filters.status}
              options={statuses.map((status) => ({ value: status, label: statusLabels[status] }))}
              onChange={(value) => set("status", value as CallStatus | "")}
            />
            <FilterSelect
              id="call-filter-agent"
              label={t("labels.agent")}
              value={filters.agentId}
              options={(agents ?? []).map((agent) => ({ value: agent.id, label: agent.name }))}
              onChange={(value) => set("agentId", value)}
            />
            <FilterSelect
              id="call-filter-number"
              label={t("filters.phoneNumber")}
              value={filters.phoneNumberId}
              options={(numbers ?? []).map((number) => ({
                value: number.id,
                label: number.friendly_name ?? formatE164(number.e164),
              }))}
              onChange={(value) => set("phoneNumberId", value)}
            />
            <FilterSelect
              id="call-filter-date"
              label={t("filters.period")}
              value={filters.datePreset}
              options={DATE_PRESETS.map((preset) => ({
                value: preset,
                label: dateLabel(preset),
              }))}
              onChange={(value) => set("datePreset", value as DatePreset)}
            />
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="call-filter-recording">{t("filters.hasRecording")}</Label>
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
            <Badge key={chip.key} variant="outline" className="h-6 gap-1 pe-1">
              {chip.label}
              <button
                type="button"
                onClick={() => clear(chip.key)}
                aria-label={t("filters.removeFilter", { label: chip.label })}
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
            {t("filters.clearAll")}
          </Button>
        </div>
      )}
    </div>
  );
}
