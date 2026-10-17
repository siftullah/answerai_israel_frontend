"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useBusiness } from "@/components/business/business-provider";
import { toastRecipientsSummary } from "@/components/campaigns/detail/recipients/summary";
import { contactDisplayName } from "@/components/contacts/contact-display";
import { useContactSelection } from "@/components/contacts/use-contact-selection";
import { useAddRecipientsFromContacts } from "@/hooks/use-campaign-recipients";
import { useContactsInfinite, useContactTags } from "@/hooks/use-contacts";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { Campaign, ContactListFilters, FromContactsPayload } from "@/lib/api/types";
import { formatE164 } from "@/lib/phone";

const MAX_EXPLICIT_IDS = 1000;

/** Build the audience from the contact book — the importer applies the same
 * DNC/duplicate/invalid rules as every other add path. */
export function FromContactsDialog({
  campaign,
  open,
  onOpenChange,
}: {
  campaign: Campaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { business } = useBusiness();
  const addFromContacts = useAddRecipientsFromContacts(business.id, campaign.id);
  const tagsQuery = useContactTags(business.id);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [tag, setTag] = useState("all");

  const dialogFilters = useMemo<Pick<ContactListFilters, "q" | "tag">>(
    () => ({
      ...(debouncedSearch !== "" ? { q: debouncedSearch } : {}),
      ...(tag !== "all" ? { tag } : {}),
    }),
    [debouncedSearch, tag]
  );
  const filtersKey = JSON.stringify(dialogFilters);

  const contactsQuery = useContactsInfinite(business.id, dialogFilters);
  const contacts = contactsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const loadedIds = contacts.map((contact) => contact.id);

  const selectionApi = useContactSelection(filtersKey);
  const allLoadedSelected =
    contacts.length > 0 && loadedIds.every((id) => selectionApi.isSelected(id));
  const allMatching = selectionApi.selection.mode === "all-matching";

  const tagItems = useMemo(
    () => [
      { value: "all", label: "All tags" },
      ...(tagsQuery.data ?? []).map((value) => ({ value, label: value })),
    ],
    [tagsQuery.data]
  );

  const explicitCount = selectionApi.count ?? 0;
  const overIdCap = !allMatching && explicitCount > MAX_EXPLICIT_IDS;

  const submit = () => {
    const payload: FromContactsPayload = allMatching
      ? { filters: dialogFilters } // {} is valid and means every contact
      : { ids: [...(selectionApi.selection.mode === "explicit" ? selectionApi.selection.ids : [])] };

    addFromContacts.mutate(payload, {
      onSuccess: (summary) => {
        toastRecipientsSummary(summary);
        onOpenChange(false);
      },
      onError: (error) =>
        toast.error(
          error.reason === "campaign_locked"
            ? "This campaign has finished — recipients can no longer be added."
            : error.message
        ),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(44rem,85dvh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Add from contacts</DialogTitle>
          <DialogDescription>
            Each contact&apos;s primary number joins the campaign. Contacts without a
            phone are skipped; do-not-call numbers are blocked automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, company or phone"
              className="w-full sm:w-64"
              autoComplete="off"
            />
            <Select
              items={tagItems}
              value={tag}
              onValueChange={(value) => setTag((value as string | null) ?? "all")}
            >
              <SelectTrigger aria-label="Filter by tag">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tagItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {contactsQuery.isPending ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-4" />
            </div>
          ) : contactsQuery.isError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {contactsQuery.error.message}
            </p>
          ) : contacts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No contacts match.
            </p>
          ) : (
            <div className="flex flex-col rounded-xl border">
              <label className="flex cursor-pointer items-center gap-3 border-b bg-muted/50 px-3 py-2">
                <Checkbox
                  aria-label="Select all loaded contacts"
                  checked={allLoadedSelected}
                  indeterminate={!allLoadedSelected && selectionApi.active}
                  onCheckedChange={() => selectionApi.togglePage(loadedIds)}
                />
                <span className="text-sm font-medium">
                  {allMatching
                    ? "Everything matching your filters selected"
                    : `${explicitCount} selected`}
                </span>
                {allLoadedSelected && !allMatching && Boolean(contactsQuery.hasNextPage) && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={selectionApi.enterAllMatching}
                  >
                    Select everything matching
                  </Button>
                )}
              </label>

              {contacts.map((contact) => {
                const phone = contact.phones.find((p) => p.primary) ?? contact.phones[0];
                return (
                  <label
                    key={contact.id}
                    className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-0 hover:bg-muted/30"
                  >
                    <Checkbox
                      aria-label={`Select ${contactDisplayName(contact)}`}
                      checked={selectionApi.isSelected(contact.id)}
                      onCheckedChange={() => selectionApi.toggle(contact.id, loadedIds)}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {contactDisplayName(contact)}
                    </span>
                    {contact.on_dnc && <Badge variant="destructive">On DNC</Badge>}
                    <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                      {phone ? formatE164(phone.e164) : "No phone"}
                    </span>
                  </label>
                );
              })}

              {contactsQuery.hasNextPage && (
                <div className="flex justify-center border-t p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={contactsQuery.isFetchingNextPage}
                    onClick={() => void contactsQuery.fetchNextPage()}
                  >
                    {contactsQuery.isFetchingNextPage && <Spinner />}
                    Load more
                  </Button>
                </div>
              )}
            </div>
          )}

          {overIdCap && (
            <p className="text-sm text-destructive">
              Up to {MAX_EXPLICIT_IDS} individually-picked contacts per batch — use
              &ldquo;Select everything matching&rdquo; with filters instead.
            </p>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectionApi.active || overIdCap || addFromContacts.isPending}
            onClick={submit}
          >
            {addFromContacts.isPending && <Spinner />}
            {allMatching ? "Add all matching" : `Add ${explicitCount} to campaign`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
