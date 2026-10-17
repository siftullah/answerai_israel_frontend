"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon, RotateCcwIcon, UploadIcon, UsersIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";
import { useBusiness } from "@/components/business/business-provider";
import { campaignIsTransitional } from "@/hooks/use-campaigns";
import {
  useBulkDeleteRecipients,
  useBulkRetryRecipients,
  useCampaignRecipientsInfinite,
  useDeleteRecipient,
  useRetryRecipient,
} from "@/hooks/use-campaign-recipients";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useContactSelection } from "@/components/contacts/use-contact-selection";
import { AddRecipientsDialog } from "@/components/campaigns/detail/recipients/add-recipients-dialog";
import { FromContactsDialog } from "@/components/campaigns/detail/recipients/from-contacts-dialog";
import { RecipientBulkBar } from "@/components/campaigns/detail/recipients/recipient-bulk-bar";
import { RecipientImportDialog } from "@/components/campaigns/detail/recipients/recipient-import-dialog";
import {
  RecipientsTable,
  recipientIsRetryable,
  type RecipientListSelection,
} from "@/components/campaigns/detail/recipients/recipients-table";
import {
  RetryConfirmDialog,
  type RetryTarget,
} from "@/components/campaigns/detail/recipients/retry-confirm-dialog";
import type {
  Campaign,
  CampaignRecipient,
  CampaignRecipientStatus,
  RecipientListFilters,
} from "@/lib/api/types";
import { TERMINAL_CAMPAIGN_STATUSES } from "@/lib/api/types";
import { formatE164 } from "@/lib/phone";
import { queryKeys } from "@/lib/query/keys";

type StatusFilter = "all" | CampaignRecipientStatus;

// Base UI's SelectValue renders the raw value unless the root knows the
// item labels — without this the filter trigger shows e.g. "all".
const STATUS_ITEMS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "queued", label: "Queued" },
  { value: "calling", label: "Calling" },
  { value: "completed", label: "Completed" },
  { value: "retry_scheduled", label: "Retry scheduled" },
  { value: "failed", label: "Failed" },
  { value: "max_attempts", label: "Max attempts" },
  { value: "dnc_blocked", label: "On DNC" },
  { value: "invalid", label: "Invalid" },
  { value: "skipped", label: "Skipped" },
  { value: "canceled", label: "Canceled" },
];

const IMPORT_SETTLE_MS = 120_000;

export function RecipientsTab({
  campaign,
  onGoToSettings,
}: {
  campaign: Campaign;
  onGoToSettings: () => void;
}) {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [status, setStatus] = useState<StatusFilter>("all");

  const apiFilters = useMemo<RecipientListFilters>(
    () => ({
      ...(debouncedSearch !== "" ? { q: debouncedSearch } : {}),
      ...(status !== "all" ? { status } : {}),
    }),
    [debouncedSearch, status]
  );
  const hasFilters = Object.keys(apiFilters).length > 0;
  const filtersKey = JSON.stringify(apiFilters);

  const transitional = campaignIsTransitional(campaign);
  const recipientsQuery = useCampaignRecipientsInfinite(business.id, campaign.id, apiFilters, {
    poll: transitional,
  });

  // A CSV import 202s and lands in the background with no job-status endpoint.
  // A draft campaign isn't transitional, so nothing would refresh — poll the
  // campaign detail prefix (stats + recipient pages) for a couple of minutes.
  const [importedAt, setImportedAt] = useState<number | null>(null);
  useEffect(() => {
    if (importedAt === null) return;
    const interval = setInterval(() => {
      if (Date.now() - importedAt > IMPORT_SETTLE_MS) {
        setImportedAt(null);
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business(business.id, "campaigns", "detail", campaign.id),
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [importedAt, business.id, campaign.id, queryClient]);

  const retryRecipient = useRetryRecipient(business.id, campaign.id);
  const bulkRetry = useBulkRetryRecipients(business.id, campaign.id);
  const deleteRecipient = useDeleteRecipient(business.id, campaign.id);
  const bulkDelete = useBulkDeleteRecipients(business.id, campaign.id);

  const [addOpen, setAddOpen] = useState(false);
  const [fromContactsOpen, setFromContactsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [retrying, setRetrying] = useState<RetryTarget | null>(null);
  const [deleting, setDeleting] = useState<CampaignRecipient | null>(null);
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = recipientsQuery;
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const recipients = recipientsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const loadedIds = recipients.map((recipient) => recipient.id);

  const selectionApi = useContactSelection(filtersKey);
  const allLoadedSelected =
    recipients.length > 0 && loadedIds.every((id) => selectionApi.isSelected(id));
  const listSelection: RecipientListSelection = {
    isSelected: selectionApi.isSelected,
    onToggleRow: (id) => selectionApi.toggle(id, loadedIds),
    onToggleAll: () => selectionApi.togglePage(loadedIds),
    headerChecked: allLoadedSelected,
    headerIndeterminate: !allLoadedSelected && selectionApi.active,
  };
  const selectedIds =
    selectionApi.selection.mode === "explicit" ? [...selectionApi.selection.ids] : [];
  const retryableSelectedCount = recipients.filter(
    (recipient) =>
      selectionApi.isSelected(recipient.id) && recipientIsRetryable(recipient, campaign)
  ).length;

  const terminal = TERMINAL_CAMPAIGN_STATUSES.includes(campaign.status);
  const agentId = campaign.agent?.id ?? null;
  const failedCount =
    campaign.stats.failed + campaign.stats.max_attempts + campaign.stats.skipped;
  const showRetryAllFailed = failedCount > 0 && campaign.status !== "canceled";

  const plural = (n: number) => (n === 1 ? "recipient" : "recipients");

  const runRetry = (target: RetryTarget) => {
    setRetrying(null);
    if (target.kind === "single") {
      retryRecipient.mutate(target.recipient.id, {
        onSuccess: () => toast.success("Recipient queued for another attempt"),
        onError: (error) =>
          toast.error(
            error.reason === "recipient_not_retryable"
              ? "Only failed or skipped recipients can be retried."
              : error.reason === "campaign_locked"
                ? "Canceled campaigns can't retry recipients."
                : error.message
          ),
      });
      return;
    }
    const payload =
      target.kind === "ids"
        ? { ids: target.ids }
        : {
            statuses: ["failed", "max_attempts", "skipped"] as (
              | "failed"
              | "max_attempts"
              | "skipped"
            )[],
          };
    bulkRetry.mutate(payload, {
      onSuccess: ({ affected }) => {
        if (affected > 0) {
          toast.success(`Requeued ${affected} ${plural(affected)}`);
        } else {
          toast.warning("Nothing to retry");
        }
        selectionApi.clear();
      },
      onError: (error) =>
        toast.error(
          error.reason === "campaign_locked"
            ? "Canceled campaigns can't retry recipients."
            : error.message
        ),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search phone or name"
          className="w-full sm:w-64"
          autoComplete="off"
        />
        <Select
          items={STATUS_ITEMS}
          value={status}
          onValueChange={(value) => setStatus((value as StatusFilter | null) ?? "all")}
        >
          <SelectTrigger aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {showRetryAllFailed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRetrying({ kind: "all-failed" })}
            >
              <RotateCcwIcon />
              Retry all failed or skipped
            </Button>
          )}
          {!terminal && (
            <>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <UploadIcon />
                Import CSV
              </Button>
              <Button variant="cta" size="sm" onClick={() => setFromContactsOpen(true)}>
                <UsersIcon />
                From contacts
              </Button>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <PlusIcon />
                Add recipients
              </Button>
            </>
          )}
        </div>
      </div>

      {recipientsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : recipientsQuery.isError ? (
        <ErrorState
          title="Couldn't load recipients"
          message={recipientsQuery.error.message}
          onRetry={() => recipientsQuery.refetch()}
        />
      ) : recipients.length === 0 ? (
        hasFilters ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No recipients match your filters.
          </p>
        ) : (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>No recipients yet</EmptyTitle>
              <EmptyDescription>
                Add numbers by hand, pick people from your contacts, or import a
                spreadsheet — then start the campaign.
              </EmptyDescription>
            </EmptyHeader>
            {!terminal && (
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <UploadIcon />
                  Import CSV
                </Button>
                <Button variant="cta" onClick={() => setFromContactsOpen(true)}>
                  <UsersIcon />
                  From contacts
                </Button>
                <Button onClick={() => setAddOpen(true)}>
                  <PlusIcon />
                  Add recipients
                </Button>
              </div>
            )}
          </Empty>
        )
      ) : (
        <>
          <RecipientsTable
            recipients={recipients}
            campaign={campaign}
            businessUuid={business.id}
            timeZone={business.timezone}
            selection={listSelection}
            onRetry={(recipient) => setRetrying({ kind: "single", recipient })}
            onDelete={setDeleting}
          />
          {hasNextPage && <div ref={sentinelRef} aria-hidden className="h-px" />}
          {isFetchingNextPage && (
            <div className="flex justify-center py-3">
              <Spinner className="size-4" />
            </div>
          )}
          {selectionApi.active && selectedIds.length > 0 && (
            <RecipientBulkBar
              count={selectedIds.length}
              retryableCount={retryableSelectedCount}
              onRetry={() => setRetrying({ kind: "ids", ids: selectedIds })}
              onDelete={() => setConfirmingBulkDelete(true)}
              onClear={selectionApi.clear}
            />
          )}
        </>
      )}

      {addOpen && agentId && (
        <AddRecipientsDialog
          campaign={campaign}
          agentId={agentId}
          open
          onOpenChange={(next) => {
            if (!next) setAddOpen(false);
          }}
        />
      )}

      {fromContactsOpen && (
        <FromContactsDialog
          campaign={campaign}
          open
          onOpenChange={(next) => {
            if (!next) setFromContactsOpen(false);
          }}
        />
      )}

      {importOpen && agentId && (
        <RecipientImportDialog
          campaign={campaign}
          agentId={agentId}
          open
          onOpenChange={(next) => {
            if (!next) setImportOpen(false);
          }}
          onImported={() => setImportedAt(Date.now())}
        />
      )}

      <RetryConfirmDialog
        campaign={campaign}
        target={retrying}
        onOpenChange={(next) => {
          if (!next) setRetrying(null);
        }}
        onConfirm={runRetry}
        onGoToSettings={onGoToSettings}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {deleting ? formatE164(deleting.to_e164) : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They won&apos;t be called by this campaign. The number can be added again
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteRecipient.mutate(deleting.id, {
                  onSuccess: () => toast.success("Recipient removed"),
                  onError: (error) =>
                    toast.error(
                      error.reason === "recipient_calling"
                        ? "Can't remove a recipient who's on a call right now."
                        : error.message
                    ),
                });
                setDeleting(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmingBulkDelete} onOpenChange={setConfirmingBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {selectedIds.length} {plural(selectedIds.length)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They won&apos;t be called by this campaign. Anyone currently on a call is
              skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                bulkDelete.mutate(
                  { ids: selectedIds },
                  {
                    onSuccess: ({ affected, skipped_calling }) => {
                      const skipped =
                        skipped_calling > 0
                          ? ` — ${skipped_calling} skipped (currently on a call)`
                          : "";
                      toast.success(`Removed ${affected} ${plural(affected)}${skipped}`);
                      selectionApi.clear();
                    },
                    onError: (error) => toast.error(error.message),
                  }
                );
                setConfirmingBulkDelete(false);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
