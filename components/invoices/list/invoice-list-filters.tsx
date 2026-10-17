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
import type { InvoiceStatus } from "@/lib/api/types";
import { INVOICE_STATUS_LABELS } from "@/lib/api/types";

/** "" = not filtering on that dimension. */
export interface InvoiceFilterState {
  /** Refines the tab's status set down to a single status. */
  status: InvoiceStatus | "";
}

export const EMPTY_INVOICE_FILTERS: InvoiceFilterState = { status: "" };

/**
 * Filter head for the invoices rail: search plus a status refine limited to
 * the active tab's set. Single-status tabs (Overdue, Paid) get search only.
 */
export function InvoiceListFilters({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  statuses,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filters: InvoiceFilterState;
  onFiltersChange: (filters: InvoiceFilterState) => void;
  /** Refine options for the active tab; empty hides the filter popover. */
  statuses: readonly InvoiceStatus[];
}) {
  const items = [
    { value: "", label: "Any status" },
    ...statuses.map((status) => ({ value: status, label: INVOICE_STATUS_LABELS[status] })),
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search number or contact…"
          aria-label="Search invoices by number or contact name"
        />
        {statuses.length > 0 && (
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Filter invoices"
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
              <Label htmlFor="invoice-filter-status">Status</Label>
              <Select
                items={items}
                value={filters.status}
                onValueChange={(next) =>
                  onFiltersChange({ status: (next as InvoiceStatus | null) ?? "" })
                }
              >
                <SelectTrigger id="invoice-filter-status" className="w-full">
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
            {INVOICE_STATUS_LABELS[filters.status]}
            <button
              type="button"
              onClick={() => onFiltersChange(EMPTY_INVOICE_FILTERS)}
              aria-label={`Remove ${INVOICE_STATUS_LABELS[filters.status]} filter`}
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
