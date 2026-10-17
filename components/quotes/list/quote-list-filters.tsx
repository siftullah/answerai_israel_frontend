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
import type { QuoteStatus } from "@/lib/api/types";
import { QUOTE_STATUS_LABELS } from "@/lib/api/types";

/** "" = not filtering on that dimension. */
export interface QuoteFilterState {
  /** Refines the tab's status set down to a single status. */
  status: QuoteStatus | "";
}

export const EMPTY_QUOTE_FILTERS: QuoteFilterState = { status: "" };

/**
 * Filter head for the quotes rail: search plus a status refine limited to
 * the active tab's set. Single-status tabs (Expired, Accepted) get search only.
 */
export function QuoteListFilters({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  statuses,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filters: QuoteFilterState;
  onFiltersChange: (filters: QuoteFilterState) => void;
  /** Refine options for the active tab; empty hides the filter popover. */
  statuses: readonly QuoteStatus[];
}) {
  const items = [
    { value: "", label: "Any status" },
    ...statuses.map((status) => ({ value: status, label: QUOTE_STATUS_LABELS[status] })),
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search number, title or contact…"
          aria-label="Search quotes by number, title or contact name"
        />
        {statuses.length > 0 && (
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Filter quotes"
                  className="relative shrink-0"
                />
              }
            >
              <ListFilterIcon />
              {filters.status !== "" && (
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" />
              )}
            </PopoverTrigger>
            <PopoverContent align="end" className="flex w-64 flex-col gap-1.5">
              <Label htmlFor="quote-filter-status">Status</Label>
              <Select
                items={items}
                value={filters.status}
                onValueChange={(next) =>
                  onFiltersChange({ status: (next as QuoteStatus | null) ?? "" })
                }
              >
                <SelectTrigger id="quote-filter-status" className="w-full">
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
            </PopoverContent>
          </Popover>
        )}
      </div>

      {filters.status !== "" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="h-6 gap-1 pr-1">
            {QUOTE_STATUS_LABELS[filters.status]}
            <button
              type="button"
              onClick={() => onFiltersChange(EMPTY_QUOTE_FILTERS)}
              aria-label={`Remove ${QUOTE_STATUS_LABELS[filters.status]} filter`}
              className="rounded-full p-0.5 hover:bg-muted"
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        </div>
      )}
    </div>
  );
}
