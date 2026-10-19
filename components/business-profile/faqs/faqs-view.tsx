"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
import { FaqModal } from "@/components/business-profile/faqs/faq-modal";
import { ManageCategoriesDialog } from "@/components/business-profile/faqs/manage-categories-dialog";
import { ViewModeToggle } from "@/components/business-profile/view-mode-toggle";
import { useCreateFaqCategory, useFaqCategories } from "@/hooks/use-faq-categories";
import { useViewMode } from "@/hooks/use-view-mode";
import { useCreateFaq, useDeleteFaq, useFaqs } from "@/hooks/use-faqs";
import type { Faq, FaqDraft, FaqPayload } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Draft rows carry the extracted category NAME until confirm resolves it. */
interface FaqDraftItem {
  payload: FaqPayload;
  categoryName: string | null;
}

const truncate = (text: string, max = 90) =>
  text.length > max ? `${text.slice(0, max)}…` : text;

function FaqRowActions({
  faq,
  onEdit,
  onDelete,
}: {
  faq: Faq;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ts = useTranslations("knowledge.shared");
  const tc = useTranslations("common");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={ts("rowActions", { name: faq.question })}
          />
        }
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon />
          {tc("actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2Icon />
          {tc("actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FaqsView() {
  const { business } = useBusiness();
  const t = useTranslations("knowledge.faqs");
  const ts = useTranslations("knowledge.shared");
  const tc = useTranslations("common");

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const faqsQuery = useFaqs(business.id, categoryId ? { category_id: categoryId } : {});
  const categoriesQuery = useFaqCategories(business.id);
  const createFaq = useCreateFaq(business.id);
  const createCategory = useCreateFaqCategory(business.id);
  const deleteFaq = useDeleteFaq(business.id);

  const [viewMode, setViewMode] = useViewMode("faqs");
  const [editor, setEditor] = useState<{ source: Faq | null } | null>(null);
  const [deleting, setDeleting] = useState<Faq | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  const [draftRows, setDraftRows] = useState<DraftRow<FaqDraftItem>[] | null>(null);
  const [draftEditIndex, setDraftEditIndex] = useState<number | null>(null);
  const createdCategories = useRef(new Map<string, string>());

  const onExtractionReady = (draft: unknown) => {
    const items = ((draft as { faqs?: FaqDraft[] }).faqs ?? []).filter(
      (item) => item.question && item.answer
    );
    if (items.length === 0) {
      toast.info(ts("nothingExtracted"));
      return;
    }
    setDraftRows(
      toDraftRows(
        items.map(
          (item): FaqDraftItem => ({
            payload: {
              question: item.question,
              answer: item.answer,
              faq_category_id: null,
              agent_scope: "all",
              agent_ids: [],
            },
            categoryName: item.category ?? null,
          })
        )
      )
    );
  };

  /** Case-insensitively reuse an existing category or create it once. */
  const resolveCategoryId = async (name: string | null): Promise<string | null> => {
    const key = name?.trim().toLowerCase();
    if (!key) return null;
    const existing = categoriesQuery.data?.find(
      (category) => category.name.toLowerCase() === key
    );
    if (existing) return existing.id;
    const cached = createdCategories.current.get(key);
    if (cached) return cached;
    const created = await createCategory.mutateAsync({
      name: (name as string).trim().slice(0, 100),
    });
    createdCategories.current.set(key, created.id);
    return created.id;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <ExtractionDialog
              target="faqs"
              title={t("extract.title")}
              description={t("extract.description")}
              onReady={(extraction) => onExtractionReady(extraction.draft)}
            />
            <Button onClick={() => setEditor({ source: null })}>
              <PlusIcon />
              {t("add")}
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setCategoryId(null)}
          className={cn(
            "rounded-full border px-3 py-1 text-sm",
            categoryId === null
              ? "border-transparent bg-primary/10 font-medium text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {tc("labels.all")}
        </button>
        {(categoriesQuery.data ?? []).map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setCategoryId(categoryId === category.id ? null : category.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              categoryId === category.id
                ? "border-transparent bg-primary/10 font-medium text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {category.name}
            {typeof category.faqs_count === "number" && (
              <span className="ms-1 text-sm opacity-70">{category.faqs_count}</span>
            )}
          </button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setManageOpen(true)}>
          {t("manageCategories")}
        </Button>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} className="ms-auto" />
      </div>

      {faqsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : faqsQuery.isError ? (
        <ErrorState
          title={t("loadError")}
          message={faqsQuery.error.message}
          onRetry={() => faqsQuery.refetch()}
        />
      ) : faqsQuery.data.length === 0 ? (
        categoryId !== null ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("noneInCategory")}
          </p>
        ) : (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>{t("empty.title")}</EmptyTitle>
              <EmptyDescription>{t("empty.description")}</EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => setEditor({ source: null })}>
              <PlusIcon />
              {t("add")}
            </Button>
          </Empty>
        )
      ) : viewMode === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {faqsQuery.data.map((faq) => (
            <div key={faq.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 min-w-0 flex-1 font-medium">{faq.question}</p>
                <FaqRowActions
                  faq={faq}
                  onEdit={() => setEditor({ source: faq })}
                  onDelete={() => setDeleting(faq)}
                />
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{faq.answer}</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3 text-sm text-muted-foreground">
                <span>{faq.category?.name ?? t("noCategory")}</span>
                {faq.agent_scope === "all" ? (
                  <span>· {ts("allAgents")}</span>
                ) : (
                  <Badge variant="secondary">
                    {ts("selectedAgents", { count: faq.agent_ids?.length ?? 0 })}
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
                <TableHead>{t("question")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead>{ts("agents")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {faqsQuery.data.map((faq) => (
                <TableRow key={faq.id}>
                  <TableCell>
                    <div className="flex max-w-96 flex-col">
                      <span className="truncate font-medium">{faq.question}</span>
                      <span className="truncate text-sm text-muted-foreground">
                        {truncate(faq.answer)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {faq.category?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {faq.agent_scope === "all" ? (
                      <span className="text-muted-foreground">{ts("allAgents")}</span>
                    ) : (
                      <Badge variant="secondary">
                        {ts("selectedAgents", { count: faq.agent_ids?.length ?? 0 })}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <FaqRowActions
                      faq={faq}
                      onEdit={() => setEditor({ source: faq })}
                      onDelete={() => setDeleting(faq)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      {editor && (
        <FaqModal
          open
          onOpenChange={(next) => {
            if (!next) setEditor(null);
          }}
          source={editor.source}
        />
      )}

      <ManageCategoriesDialog open={manageOpen} onOpenChange={setManageOpen} />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteFaq.mutate(deleting.id, {
                  onSuccess: () => toast.success(t("toasts.deleted")),
                  onError: (error) => toast.error(error.message),
                });
                setDeleting(null);
              }}
            >
              {tc("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {draftRows && (
        <DraftListReview<FaqDraftItem>
          open
          onOpenChange={(next) => {
            if (!next) setDraftRows(null);
          }}
          title={t("review.title")}
          addLabel={(count) => t("review.addCount", { count })}
          addedLabel={(count) => t("review.addedCount", { count })}
          rows={draftRows}
          onRowsChange={setDraftRows}
          summary={(item) => ({
            name: item.payload.question ?? "",
            detail: item.categoryName ?? truncate(item.payload.answer ?? "", 60),
          })}
          onEdit={(index) => setDraftEditIndex(index)}
          createItem={async (item) => {
            const faq_category_id =
              item.payload.faq_category_id ?? (await resolveCategoryId(item.categoryName));
            await createFaq.mutateAsync({ ...item.payload, faq_category_id });
          }}
        />
      )}

      {draftRows && draftEditIndex !== null && (
        <FaqModal
          open
          onOpenChange={(next) => {
            if (!next) setDraftEditIndex(null);
          }}
          source={draftRows[draftEditIndex].item.payload}
          onSubmitOverride={(payload) => {
            setDraftRows(
              (rows) =>
                rows &&
                rows.map((row, index) =>
                  index === draftEditIndex
                    ? {
                        ...row,
                        item: { payload, categoryName: null },
                        status: "pending",
                        error: undefined,
                      }
                    : row
                )
            );
          }}
        />
      )}
    </div>
  );
}
