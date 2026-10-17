"use client";

import { ExternalLinkIcon, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DocStatusBadge } from "@/components/business-profile/docs/doc-status-badge";
import { useBusiness } from "@/components/business/business-provider";
import { useDocument } from "@/hooks/use-documents";
import type { KnowledgeDocument, KnowledgeDocumentDetail } from "@/lib/api/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SourceLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-1.5 text-sm text-primary hover:underline"
    >
      <span className="truncate">{url}</span>
      <ExternalLinkIcon className="size-3.5 shrink-0" />
    </a>
  );
}

function DocBody({ body }: { body: string }) {
  return <p className="text-sm whitespace-pre-wrap">{body}</p>;
}

function DocViewContent({ detail }: { detail: KnowledgeDocumentDetail }) {
  const preparing = detail.status === "uploading" || detail.status === "processing";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <DocStatusBadge doc={detail} />
        {detail.status === "error" && detail.error && (
          <p className="text-sm text-destructive">{detail.error}</p>
        )}
      </div>

      {detail.source_type === "integration" && (
        <>
          <p className="text-sm text-muted-foreground">
            From {detail.integration?.provider_name ?? "an integration"}
            {detail.integration?.feed_name ? ` — ${detail.integration.feed_name}` : ""}.
            Content refreshes automatically and is managed from the Integrations
            section.
          </p>
          {detail.body !== null && <DocBody body={detail.body} />}
        </>
      )}

      {detail.source_type === "text" && detail.body !== null && (
        <DocBody body={detail.body} />
      )}

      {detail.source_type === "url" && (
        <>
          {detail.source_url && <SourceLink url={detail.source_url} />}
          {detail.body !== null ? (
            <DocBody body={detail.body} />
          ) : preparing ? (
            <p className="text-sm text-muted-foreground">
              We&apos;re reading the page and preparing the content — check back in
              a moment.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              This doc is fetched directly from the source by the voice engine —
              its content isn&apos;t stored here. Add it again to get an editable
              copy.
            </p>
          )}
        </>
      )}

      {detail.source_type === "file" && detail.file && (
        <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
          <div className="flex min-w-0 items-center gap-3">
            <FileIcon className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{detail.file.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatBytes(detail.file.size)}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            render={
              // Signed, expiring URL — always fetched fresh with the doc.
              <a href={detail.file.url} target="_blank" rel="noreferrer" />
            }
          >
            <ExternalLinkIcon />
            Open file
          </Button>
        </div>
      )}
    </div>
  );
}

export function DocViewModal({
  doc,
  open,
  onOpenChange,
}: {
  doc: KnowledgeDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { business } = useBusiness();
  const detailQuery = useDocument(business.id, open ? doc.id : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{doc.name}</DialogTitle>
          {doc.description && <DialogDescription>{doc.description}</DialogDescription>}
        </DialogHeader>
        <div className="scrollbar-slim -mx-2 max-h-[65vh] overflow-y-auto px-2">
          {detailQuery.isPending ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : detailQuery.isError ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-destructive">{detailQuery.error.message}</p>
              <Button variant="outline" size="sm" onClick={() => detailQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <DocViewContent detail={detailQuery.data} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
