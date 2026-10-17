"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DownloadIcon,
  EllipsisVerticalIcon,
  InfoIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness } from "@/components/business/business-provider";
import { DataTableShell } from "@/components/business-profile/data-table-shell";
import { AddDncDialog } from "@/components/contacts/dnc/add-dnc-dialog";
import { SourceBadge } from "@/components/contacts/source-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDncInfinite, useRemoveDncEntry } from "@/hooks/use-dnc";
import type { DncEntry, DncListFilters, DncSource } from "@/lib/api/types";
import { endpoints } from "@/lib/api/endpoints";
import { downloadFile } from "@/lib/api/download";
import { formatDate } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";

type SourceFilter = "all" | DncSource;

// Base UI's SelectValue renders the raw value unless the root knows the
// item labels — without this the filter trigger shows e.g. "all".
const SOURCE_ITEMS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "manual", label: "Manual" },
  { value: "ai", label: "Added by AI" },
];

export function DncView() {
  const { business } = useBusiness();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [source, setSource] = useState<SourceFilter>("all");

  // Conditional spreads so empty filters never appear as query-key segments.
  const apiFilters = useMemo<DncListFilters>(
    () => ({
      ...(debouncedSearch !== "" ? { q: debouncedSearch } : {}),
      ...(source !== "all" ? { source } : {}),
    }),
    [debouncedSearch, source]
  );
  const hasFilters = debouncedSearch !== "" || source !== "all";

  const dncQuery = useDncInfinite(business.id, apiFilters);
  const removeEntry = useRemoveDncEntry(business.id);

  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<DncEntry | null>(null);
  const [exporting, setExporting] = useState(false);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = dncQuery;
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

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadFile(
        endpoints.dnc.export,
        apiFilters,
        `dnc-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const entries = dncQuery.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Do not call (DNC)"
        description="Numbers your AI must never call."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={exporting}>
              {exporting ? <Spinner /> : <DownloadIcon />}
              Export
            </Button>
            <Button onClick={() => setAdding(true)}>
              <PlusIcon />
              Add number
            </Button>
          </>
        }
      />

      <Alert>
        <InfoIcon />
        <AlertTitle>Blocks outbound calls only</AlertTitle>
        <AlertDescription>
          Single calls, campaigns and scheduled callbacks all check this list before
          dialling; inbound calls aren&apos;t affected. Your AI agents add numbers here
          automatically when a caller asks. This is your business&apos;s own list — it
          doesn&apos;t register numbers on the national Do Not Call Register.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by number or reason"
          className="w-full sm:w-64"
          autoComplete="off"
        />
        <Select
          items={SOURCE_ITEMS}
          value={source}
          onValueChange={(value) => setSource((value as SourceFilter | null) ?? "all")}
        >
          <SelectTrigger aria-label="Filter by source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {dncQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : dncQuery.isError ? (
        <ErrorState
          title="Couldn't load the do-not-call list"
          message={dncQuery.error.message}
          onRetry={() => dncQuery.refetch()}
        />
      ) : entries.length === 0 ? (
        hasFilters ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No entries match your search.
          </p>
        ) : (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>No blocked numbers</EmptyTitle>
              <EmptyDescription>
                Numbers on this list are never dialled by your AI. Add one manually, or
                your agents will add callers who ask not to be contacted.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => setAdding(true)}>
              <PlusIcon />
              Add number
            </Button>
          </Empty>
        )
      ) : (
        <>
          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added by</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatE164(entry.e164)}
                    </TableCell>
                    <TableCell>
                      {entry.contact ? (
                        <Link
                          href={`/b/${business.id}/contacts/${entry.contact.id}`}
                          className="hover:underline"
                        >
                          {entry.contact.name ?? "Unnamed contact"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="block max-w-64 truncate">{entry.reason ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <SourceBadge source={entry.source} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.added_by ?? "AI agent"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(entry.created_at, business.timezone)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${formatE164(entry.e164)}`}
                            />
                          }
                        >
                          <EllipsisVerticalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setRemoving(entry)}
                          >
                            <Trash2Icon />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
          {hasNextPage && <div ref={sentinelRef} aria-hidden className="h-px" />}
          {isFetchingNextPage && (
            <div className="flex justify-center py-3">
              <Spinner className="size-4" />
            </div>
          )}
        </>
      )}

      {adding && (
        <AddDncDialog
          open
          onOpenChange={(next) => {
            if (!next) setAdding(false);
          }}
        />
      )}

      <AlertDialog
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {removing ? formatE164(removing.e164) : ""} from the list?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This number becomes callable again — single calls, campaigns and callbacks
              will all be able to dial it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!removing) return;
                removeEntry.mutate(removing.id, {
                  onSuccess: () => toast.success("Number removed from the do-not-call list"),
                  onError: (error) => toast.error(error.message),
                });
                setRemoving(null);
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
