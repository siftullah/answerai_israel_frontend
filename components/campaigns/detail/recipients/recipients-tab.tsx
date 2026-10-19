"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
import { CAMPAIGN_RECIPIENT_STATUSES, TERMINAL_CAMPAIGN_STATUSES } from "@/lib/api/types";
import { formatE164 } from "@/lib/phone";
import { queryKeys } from "@/lib/query/keys";

type StatusFilter = "all" | CampaignRecipientStatus;

const IMPORT_SETTLE_MS = 120_000;

export function RecipientsTab({
  campaign,
  onGoToSettings,
}: {
  campaign: Campaign;
  onGoToSettings: () => void;
}) {
  const t = useTranslations("campaigns");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  // Base UI's SelectValue renders the raw value unless the root knows the
  // item labels — without this the filter trigger shows e.g. "all".
  const statusItems = useMemo<{ value: StatusFilter; label: string }[]>(
    () => [
      { value: "all", label: t("filters.allStatuses") },
      ...CAMPAIGN_RECIPIENT_STATUSES.map((value) => ({
        value,
        label: t(`recipientStatus.${value}`),
      })),
    ],
    [t]
  );

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

  const runRetry = (target: RetryTarget) => {
    setRetrying(null);
    if (target.kind === "single") {
      retryRecipient.mutate(target.recipient.id, {
        onSuccess: () => toast.success(t("recipients.toasts.retried")),
        onError: (error) =>
          toast.error(
            error.reason === "recipient_not_retryable"
              ? t("recipients.errors.notRetryable")
              : error.reason === "campaign_locked"
                ? t("recipients.errors.canceledNoRetry")
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
          toast.success(t("recipients.toasts.requeued", { count: affected }));
        } else {
          toast.warning(t("recipients.toasts.nothingToRetry"));
        }
        selectionApi.clear();
      },
      onError: (error) =>
        toast.error(
          error.reason === "campaign_locked"
            ? t("recipients.errors.canceledNoRetry")
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
          placeholder={t("recipients.searchPlaceholder")}
          className="w-full sm:w-64"
          autoComplete="off"
        />
        <Select
          items={statusItems}
          value={status}
          onValueChange={(value) => setStatus((value as StatusFilter | null) ?? "all")}
        >
          <SelectTrigger aria-label={t("filters.byStatus")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          {showRetryAllFailed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRetrying({ kind: "all-failed" })}
            >
              <RotateCcwIcon />
              {t("recipients.retryAllFailed")}
            </Button>
          )}
          {!terminal && (
            <>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <UploadIcon />
                {t("recipients.importCsv")}
              </Button>
              <Button variant="cta" size="sm" onClick={() => setFromContactsOpen(true)}>
                <UsersIcon />
                {t("recipients.fromContacts")}
              </Button>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <PlusIcon />
                {t("recipients.add")}
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
          title={t("recipients.loadError")}
          message={recipientsQuery.error.message}
          onRetry={() => recipientsQuery.refetch()}
        />
      ) : recipients.length === 0 ? (
        hasFilters ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("recipients.noMatches")}
          </p>
        ) : (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>{t("recipients.emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("recipients.emptyDescription")}</EmptyDescription>
            </EmptyHeader>
            {!terminal && (
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <UploadIcon />
                  {t("recipients.importCsv")}
                </Button>
                <Button variant="cta" onClick={() => setFromContactsOpen(true)}>
                  <UsersIcon />
                  {t("recipients.fromContacts")}
                </Button>
                <Button onClick={() => setAddOpen(true)}>
                  <PlusIcon />
                  {t("recipients.add")}
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
              {t("recipients.removeDialog.title", {
                phone: deleting ? formatE164(deleting.to_e164) : "",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("recipients.removeDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteRecipient.mutate(deleting.id, {
                  onSuccess: () => toast.success(t("recipients.toasts.removed")),
                  onError: (error) =>
                    toast.error(
                      error.reason === "recipient_calling"
                        ? t("recipients.errors.onCall")
                        : error.message
                    ),
                });
                setDeleting(null);
              }}
            >
              {tc("actions.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmingBulkDelete} onOpenChange={setConfirmingBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("recipients.bulkRemoveDialog.title", { count: selectedIds.length })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("recipients.bulkRemoveDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                bulkDelete.mutate(
                  { ids: selectedIds },
                  {
                    onSuccess: ({ affected, skipped_calling }) => {
                      toast.success(
                        skipped_calling > 0
                          ? t("recipients.toasts.bulkRemovedWithSkipped", {
                              count: affected,
                              skipped: skipped_calling,
                            })
                          : t("recipients.toasts.bulkRemoved", { count: affected })
                      );
                      selectionApi.clear();
                    },
                    onError: (error) => toast.error(error.message),
                  }
                );
                setConfirmingBulkDelete(false);
              }}
            >
              {tc("actions.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
