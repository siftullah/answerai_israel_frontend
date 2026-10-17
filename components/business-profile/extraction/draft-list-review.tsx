"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { normalizeApiError } from "@/lib/api/errors";

export interface DraftRow<T> {
  item: T;
  checked: boolean;
  status: "pending" | "created" | "failed";
  error?: string;
}

export function toDraftRows<T>(items: T[]): DraftRow<T>[] {
  return items.map((item) => ({ item, checked: true, status: "pending" }));
}

/**
 * Review step for list-type extraction drafts (services, products, later
 * FAQs/policies): a checklist of rows, per-row Edit via the section's own
 * modal (onEdit), and a sequential-create Confirm that keeps failed rows
 * visible with their server error. Nothing is created until Confirm.
 */
export function DraftListReview<T>({
  open,
  onOpenChange,
  title,
  itemNoun,
  itemNounPlural = `${itemNoun}s`,
  rows,
  onRowsChange,
  summary,
  onEdit,
  createItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  itemNoun: string;
  itemNounPlural?: string;
  rows: DraftRow<T>[];
  onRowsChange: (rows: DraftRow<T>[]) => void;
  summary: (item: T) => { name: string; detail: string | null };
  onEdit: (index: number) => void;
  createItem: (item: T) => Promise<unknown>;
}) {
  const [running, setRunning] = useState(false);

  const pendingCount = rows.filter((row) => row.checked && row.status !== "created").length;
  const createdCount = rows.filter((row) => row.status === "created").length;

  const toggle = (index: number, checked: boolean) => {
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, checked } : row)));
  };

  const confirm = async () => {
    setRunning(true);
    const next = [...rows];
    for (let i = 0; i < next.length; i++) {
      const row = next[i];
      if (!row.checked || row.status === "created") continue;
      try {
        await createItem(row.item);
        next[i] = { ...row, status: "created", error: undefined };
      } catch (caught) {
        next[i] = { ...row, status: "failed", error: normalizeApiError(caught).message };
      }
      onRowsChange([...next]);
    }
    setRunning(false);

    const failed = next.filter((row) => row.checked && row.status === "failed").length;
    const created = next.filter((row) => row.status === "created").length;
    if (failed === 0) {
      toast.success(`${created} ${created === 1 ? itemNoun : itemNounPlural} added`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (running) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="gap-0 p-0 sm:max-w-2xl" showCloseButton={!running}>
        <div className="flex max-h-[85vh] flex-col">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Untick anything you don&apos;t want, or edit a row first. Everything stays
              editable after adding.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <ul className="flex flex-col">
              {rows.map((row, index) => {
                const { name, detail } = summary(row.item);
                return (
                  <li
                    key={index}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={row.checked}
                      disabled={running || row.status === "created"}
                      onCheckedChange={(checked) => toggle(index, checked === true)}
                      aria-label={`Include ${name}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{name}</p>
                      {row.status === "failed" ? (
                        <p className="truncate text-sm text-destructive">{row.error}</p>
                      ) : row.status === "created" ? (
                        <p className="text-sm text-muted-foreground">Added</p>
                      ) : (
                        detail && (
                          <p className="truncate text-sm text-muted-foreground">{detail}</p>
                        )
                      )}
                    </div>
                    {row.status === "created" ? (
                      <CheckIcon className="size-4 shrink-0 text-primary" />
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={running}
                        onClick={() => onEdit(index)}
                      >
                        Edit
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              disabled={running}
              onClick={() => onOpenChange(false)}
            >
              {createdCount > 0 ? "Close" : "Cancel"}
            </Button>
            <Button type="button" onClick={confirm} disabled={running || pendingCount === 0}>
              {running && <Spinner />}
              Add {pendingCount} {pendingCount === 1 ? itemNoun : itemNounPlural}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
