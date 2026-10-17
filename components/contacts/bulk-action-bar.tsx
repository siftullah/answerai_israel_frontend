"use client";

import { useState } from "react";
import { MegaphoneIcon, PhoneOffIcon, TagIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useBusiness } from "@/components/business/business-provider";
import { AddToCampaignDialog } from "@/components/contacts/add-to-campaign-dialog";
import { useBulkContactAction, useContactTags } from "@/hooks/use-contacts";
import type { ContactBulkPayload, ContactListFilters } from "@/lib/api/types";
import type { ContactSelection } from "@/components/contacts/use-contact-selection";

type BulkDialog = "tag" | "untag" | "dnc" | "delete" | "campaign" | null;

/**
 * Sticky bar shown while rows are selected. Explicit selections send ids;
 * "all-matching" replays the current filters server-side (no total is known
 * client-side — the real count arrives in the {affected} toast).
 */
export function BulkActionBar({
  selection,
  count,
  filters,
  showSelectAllMatching,
  onSelectAllMatching,
  onClear,
}: {
  selection: ContactSelection;
  count: number | null;
  filters: ContactListFilters;
  showSelectAllMatching: boolean;
  onSelectAllMatching: () => void;
  onClear: () => void;
}) {
  const { business } = useBusiness();
  const bulkAction = useBulkContactAction(business.id);
  const tagsQuery = useContactTags(business.id);

  const [dialog, setDialog] = useState<BulkDialog>(null);
  const [tag, setTag] = useState("");
  const [reason, setReason] = useState("");

  const allMatching = selection.mode === "all-matching";
  const label = allMatching
    ? "Everything matching your filters selected"
    : `${count} selected`;

  const targets: Pick<ContactBulkPayload, "ids" | "filters"> = allMatching
    ? { filters }
    : { ids: [...selection.ids] };

  const run = (
    payload: Omit<ContactBulkPayload, "ids" | "filters">,
    successMessage: (affected: number) => string
  ) => {
    bulkAction.mutate(
      { ...payload, ...targets },
      {
        onSuccess: ({ affected }) => {
          toast.success(successMessage(affected));
          closeDialog();
          onClear();
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const closeDialog = () => {
    setDialog(null);
    setTag("");
    setReason("");
  };

  const existingTags = tagsQuery.data ?? [];
  const untagItems = existingTags.map((value) => ({ value, label: value }));
  const plural = (n: number) => (n === 1 ? "contact" : "contacts");

  return (
    <>
      <div className="sticky bottom-4 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-1.5 rounded-2xl border bg-card px-3 py-2 shadow-lg">
        <span className="px-1.5 text-sm font-medium whitespace-nowrap">{label}</span>
        {showSelectAllMatching && (
          <Button variant="link" size="sm" onClick={onSelectAllMatching}>
            Select everything matching
          </Button>
        )}
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Button variant="ghost" size="sm" onClick={() => setDialog("tag")}>
          <TagIcon />
          Tag
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={existingTags.length === 0}
          onClick={() => setDialog("untag")}
        >
          <TagIcon />
          Untag
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDialog("campaign")}>
          <MegaphoneIcon />
          Add to campaign
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDialog("dnc")}>
          <PhoneOffIcon />
          Add to DNC
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setDialog("delete")}
        >
          <Trash2Icon />
          Delete
        </Button>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Button variant="ghost" size="icon-sm" aria-label="Clear selection" onClick={onClear}>
          <XIcon />
        </Button>
      </div>

      {(dialog === "tag" || dialog === "untag") && (
        <Dialog
          open
          onOpenChange={(next) => {
            if (!next) closeDialog();
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{dialog === "tag" ? "Add a tag" : "Remove a tag"}</DialogTitle>
              <DialogDescription>
                {dialog === "tag"
                  ? "The tag is added to every selected contact."
                  : "The tag is removed from every selected contact that has it."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              {dialog === "tag" ? (
                <Field>
                  <FieldLabel htmlFor="bulk-tag">Tag</FieldLabel>
                  <Input
                    id="bulk-tag"
                    value={tag}
                    maxLength={40}
                    autoComplete="off"
                    placeholder="e.g. vip"
                    onChange={(event) => setTag(event.target.value)}
                  />
                  {existingTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {existingTags.slice(0, 8).map((existing) => (
                        <button key={existing} type="button" onClick={() => setTag(existing)}>
                          <Badge variant="outline" className="cursor-pointer">
                            {existing}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor="bulk-untag">Tag</FieldLabel>
                  <Select
                    items={untagItems}
                    value={tag || null}
                    onValueChange={(value) => setTag((value as string | null) ?? "")}
                  >
                    <SelectTrigger id="bulk-untag" className="w-full">
                      <SelectValue placeholder="Choose a tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {untagItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={tag.trim() === "" || bulkAction.isPending}
                onClick={() =>
                  dialog === "tag"
                    ? run({ action: "tag", tag: tag.trim() }, (n) =>
                        `Tagged ${n} ${plural(n)}`
                      )
                    : run({ action: "untag", tag: tag.trim() }, (n) =>
                        `Removed the tag from ${n} ${plural(n)}`
                      )
                }
              >
                {bulkAction.isPending && <Spinner />}
                {dialog === "tag" ? "Add tag" : "Remove tag"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {dialog === "campaign" && (
        <AddToCampaignDialog
          selection={selection}
          filters={filters}
          open
          onOpenChange={(next) => {
            if (!next) closeDialog();
          }}
          onDone={() => {
            closeDialog();
            onClear();
          }}
        />
      )}

      {dialog === "dnc" && (
        <Dialog
          open
          onOpenChange={(next) => {
            if (!next) closeDialog();
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add to the do-not-call list</DialogTitle>
              <DialogDescription>
                Each selected contact&apos;s primary number is blocked from outbound
                calls. Contacts without a phone number are skipped.
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="bulk-dnc-reason">Reason (optional)</FieldLabel>
              <Textarea
                id="bulk-dnc-reason"
                rows={2}
                value={reason}
                placeholder="e.g. Bulk opt-out"
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={bulkAction.isPending}
                onClick={() =>
                  run(
                    { action: "dnc", ...(reason.trim() ? { reason: reason.trim() } : {}) },
                    (n) => `Added ${n} ${plural(n)} to the do-not-call list`
                  )
                }
              >
                {bulkAction.isPending && <Spinner />}
                Add to DNC
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog
        open={dialog === "delete"}
        onOpenChange={(next) => {
          if (!next) closeDialog();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {allMatching
                ? "Delete every contact matching your filters?"
                : `Delete ${count} ${plural(count ?? 0)}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes them from your contact book. Past call logs keep their names.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkAction.isPending}
              onClick={() =>
                run({ action: "delete" }, (n) => `Deleted ${n} ${plural(n)}`)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
