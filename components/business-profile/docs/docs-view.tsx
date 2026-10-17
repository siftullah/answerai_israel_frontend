"use client";

import { useState } from "react";
import {
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocStatusBadge } from "@/components/business-profile/docs/doc-status-badge";
import { DocViewModal } from "@/components/business-profile/docs/doc-view-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
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
import { DocCreateModal } from "@/components/business-profile/docs/doc-create-modal";
import { DocEditModal } from "@/components/business-profile/docs/doc-edit-modal";
import { ViewModeToggle } from "@/components/business-profile/view-mode-toggle";
import { useDeleteDocument, useDocuments } from "@/hooks/use-documents";
import { useViewMode } from "@/hooks/use-view-mode";
import type { KnowledgeDocument } from "@/lib/api/types";

function sourceDescriptor(doc: KnowledgeDocument): string {
  switch (doc.source_type) {
    case "file":
      return doc.file?.name ?? "Uploaded file";
    case "url":
      return doc.source_url ?? "Web page";
    case "text":
      return "Pasted text";
    case "integration":
      return doc.integration?.provider_name
        ? `From ${doc.integration.provider_name} — ${doc.integration.feed_name ?? doc.integration.feed}`
        : "From integration";
  }
}

function DocRowActions({
  doc,
  onView,
  onEdit,
  onDelete,
}: {
  doc: KnowledgeDocument;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Integration docs are system-managed: the sync recreates/overwrites them,
  // so they're view-only here — edit/delete lives in the Integrations section.
  const manageable = doc.source_type !== "integration";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${doc.name}`} />
        }
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          <EyeIcon />
          View
        </DropdownMenuItem>
        {manageable && (
          <>
            <DropdownMenuItem onClick={onEdit}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DocsView() {
  const { business } = useBusiness();

  const docsQuery = useDocuments(business.id);
  const deleteDoc = useDeleteDocument(business.id);
  const [viewMode, setViewMode] = useViewMode("docs");

  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<KnowledgeDocument | null>(null);
  const [editing, setEditing] = useState<KnowledgeDocument | null>(null);
  const [deleting, setDeleting] = useState<KnowledgeDocument | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Docs"
        description="Documents that feed your AI's knowledge base."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            Add doc
          </Button>
        }
      />

      {docsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : docsQuery.isError ? (
        <ErrorState
          title="Couldn't load docs"
          message={docsQuery.error.message}
          onRetry={() => docsQuery.refetch()}
        />
      ) : docsQuery.data.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Add your first doc</EmptyTitle>
            <EmptyDescription>
              Upload a file, point at a web page, or paste text — your AI reads it all.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            Add doc
          </Button>
        </Empty>
      ) : (
        <>
          <div className="flex justify-end">
            <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          </div>
          {viewMode === "cards" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {docsQuery.data.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{doc.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {doc.status === "error" && doc.error
                          ? doc.error
                          : (doc.description ?? sourceDescriptor(doc))}
                      </p>
                    </div>
                    <DocRowActions
                      doc={doc}
                      onView={() => setViewing(doc)}
                      onEdit={() => setEditing(doc)}
                      onDelete={() => setDeleting(doc)}
                    />
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3 text-sm text-muted-foreground">
                    <DocStatusBadge doc={doc} />
                    {doc.agent_scope === "all" ? (
                      <span>All agents</span>
                    ) : (
                      <Badge variant="secondary">{doc.agent_ids.length} selected</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {docsQuery.data.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex max-w-96 flex-col">
                      <span className="truncate font-medium">{doc.name}</span>
                      <span className="truncate text-sm text-muted-foreground">
                        {doc.status === "error" && doc.error
                          ? doc.error
                          : (doc.description ?? sourceDescriptor(doc))}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DocStatusBadge doc={doc} />
                  </TableCell>
                  <TableCell>
                    {doc.agent_scope === "all" ? (
                      <span className="text-muted-foreground">All agents</span>
                    ) : (
                      <Badge variant="secondary">{doc.agent_ids.length} selected</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DocRowActions
                      doc={doc}
                      onView={() => setViewing(doc)}
                      onEdit={() => setEditing(doc)}
                      onDelete={() => setDeleting(doc)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
          )}
        </>
      )}

      {createOpen && (
        <DocCreateModal
          open
          onOpenChange={(next) => {
            if (!next) setCreateOpen(false);
          }}
        />
      )}

      {viewing && (
        <DocViewModal
          open
          onOpenChange={(next) => {
            if (!next) setViewing(null);
          }}
          doc={viewing}
        />
      )}

      {editing && (
        <DocEditModal
          open
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
          doc={editing}
        />
      )}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Your AI will lose this knowledge. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteDoc.mutate(deleting.id, {
                  onSuccess: () => toast.success("Doc deleted"),
                  onError: (error) => toast.error(error.message),
                });
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
