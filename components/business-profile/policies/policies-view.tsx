"use client";

import { useState } from "react";
import { EllipsisVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import {
  DraftListReview,
  toDraftRows,
  type DraftRow,
} from "@/components/business-profile/extraction/draft-list-review";
import { ExtractionDialog } from "@/components/business-profile/extraction/extraction-dialog";
import { PolicyModal } from "@/components/business-profile/policies/policy-modal";
import { ViewModeToggle } from "@/components/business-profile/view-mode-toggle";
import { useViewMode } from "@/hooks/use-view-mode";
import {
  useBusinessPolicies,
  useCreateBusinessPolicy,
  useDeleteBusinessPolicy,
} from "@/hooks/use-business-policies";
import type { BusinessPolicy, BusinessPolicyPayload, PolicyDraft } from "@/lib/api/types";

const truncate = (text: string, max = 90) =>
  text.length > max ? `${text.slice(0, max)}…` : text;

function PolicyRowActions({
  policy,
  onEdit,
  onDelete,
}: {
  policy: BusinessPolicy;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${policy.name}`} />
        }
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2Icon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PoliciesView() {
  const { business } = useBusiness();

  const policiesQuery = useBusinessPolicies(business.id);
  const createPolicy = useCreateBusinessPolicy(business.id);
  const deletePolicy = useDeleteBusinessPolicy(business.id);

  const [viewMode, setViewMode] = useViewMode("policies");
  const [editor, setEditor] = useState<{ source: BusinessPolicy | null } | null>(null);
  const [deleting, setDeleting] = useState<BusinessPolicy | null>(null);

  const [draftRows, setDraftRows] = useState<DraftRow<BusinessPolicyPayload>[] | null>(null);
  const [draftEditIndex, setDraftEditIndex] = useState<number | null>(null);

  const onExtractionReady = (draft: unknown) => {
    const items = ((draft as { policies?: PolicyDraft[] }).policies ?? []).filter(
      (item) => item.name && item.content
    );
    if (items.length === 0) {
      toast.info("Nothing usable was extracted from that source.");
      return;
    }
    setDraftRows(
      toDraftRows(
        items.map(
          (item): BusinessPolicyPayload => ({
            name: item.name,
            content: item.content,
            agent_scope: "all",
            agent_ids: [],
          })
        )
      )
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Policies"
        description="Business policies your AI follows and explains to callers."
        actions={
          <>
            <ExtractionDialog
              target="policies"
              title="Extract policies"
              description="Pull policies from your website or a document. You review every row before anything is added."
              onReady={(extraction) => onExtractionReady(extraction.draft)}
            />
            <Button onClick={() => setEditor({ source: null })}>
              <PlusIcon />
              Add policy
            </Button>
          </>
        }
      />

      {policiesQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : policiesQuery.isError ? (
        <ErrorState
          title="Couldn't load policies"
          message={policiesQuery.error.message}
          onRetry={() => policiesQuery.refetch()}
        />
      ) : policiesQuery.data.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Add your first policy</EmptyTitle>
            <EmptyDescription>
              Cancellations, refunds, warranties — the rules your AI should follow and
              explain.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setEditor({ source: null })}>
            <PlusIcon />
            Add policy
          </Button>
        </Empty>
      ) : (
        <>
          <div className="flex justify-end">
            <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          </div>
          {viewMode === "cards" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {policiesQuery.data.map((policy) => (
                <div
                  key={policy.id}
                  className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate font-medium">{policy.name}</p>
                    <PolicyRowActions
                      policy={policy}
                      onEdit={() => setEditor({ source: policy })}
                      onDelete={() => setDeleting(policy)}
                    />
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {policy.summary ?? policy.content}
                  </p>
                  <div className="mt-auto flex items-center gap-2 border-t pt-3 text-sm text-muted-foreground">
                    {policy.agent_scope === "all" ? (
                      <span>All agents</span>
                    ) : (
                      <Badge variant="secondary">
                        {policy.agent_ids.length} selected
                      </Badge>
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
                <TableHead>Agents</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {policiesQuery.data.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell>
                    <div className="flex max-w-md flex-col">
                      <span className="truncate font-medium">{policy.name}</span>
                      <span className="truncate text-sm text-muted-foreground">
                        {policy.summary ?? truncate(policy.content)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {policy.agent_scope === "all" ? (
                      <span className="text-muted-foreground">All agents</span>
                    ) : (
                      <Badge variant="secondary">{policy.agent_ids.length} selected</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <PolicyRowActions
                      policy={policy}
                      onEdit={() => setEditor({ source: policy })}
                      onDelete={() => setDeleting(policy)}
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

      {editor && (
        <PolicyModal
          open
          onOpenChange={(next) => {
            if (!next) setEditor(null);
          }}
          source={editor.source}
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
              Your AI will stop following this policy. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deletePolicy.mutate(deleting.id, {
                  onSuccess: () => toast.success("Policy deleted"),
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

      {draftRows && (
        <DraftListReview<BusinessPolicyPayload>
          open
          onOpenChange={(next) => {
            if (!next) setDraftRows(null);
          }}
          title="Review extracted policies"
          itemNoun="policy"
          itemNounPlural="policies"
          rows={draftRows}
          onRowsChange={setDraftRows}
          summary={(item) => ({
            name: item.name ?? "",
            detail: truncate(item.content ?? "", 60),
          })}
          onEdit={(index) => setDraftEditIndex(index)}
          createItem={(item) => createPolicy.mutateAsync(item)}
        />
      )}

      {draftRows && draftEditIndex !== null && (
        <PolicyModal
          open
          onOpenChange={(next) => {
            if (!next) setDraftEditIndex(null);
          }}
          source={draftRows[draftEditIndex].item}
          onSubmitOverride={(payload) => {
            setDraftRows(
              (rows) =>
                rows &&
                rows.map((row, index) =>
                  index === draftEditIndex
                    ? { ...row, item: payload, status: "pending", error: undefined }
                    : row
                )
            );
          }}
        />
      )}
    </div>
  );
}
