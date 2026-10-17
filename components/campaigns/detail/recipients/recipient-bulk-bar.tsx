"use client";

import { RotateCcwIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * Sticky bar shown while recipient rows are selected. Explicit ids only —
 * the recipient bulk endpoints take ids or statuses, not arbitrary filters,
 * so there's no "everything matching" mode here.
 */
export function RecipientBulkBar({
  count,
  retryableCount,
  onRetry,
  onDelete,
  onClear,
}: {
  count: number;
  /** Selected rows that are actually failed/max-attempts. */
  retryableCount: number;
  onRetry: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-1.5 rounded-2xl border bg-card px-3 py-2 shadow-lg">
      <span className="px-1.5 text-sm font-medium whitespace-nowrap">{count} selected</span>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Button variant="ghost" size="sm" disabled={retryableCount === 0} onClick={onRetry}>
        <RotateCcwIcon />
        Retry{retryableCount > 0 && retryableCount !== count ? ` ${retryableCount}` : ""}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2Icon />
        Remove
      </Button>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Button variant="ghost" size="icon-sm" aria-label="Clear selection" onClick={onClear}>
        <XIcon />
      </Button>
    </div>
  );
}
