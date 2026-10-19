"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { ImportDialog } from "@/components/business-profile/products/import-dialog";
import { ProductModal } from "@/components/business-profile/products/product-modal";
import { ViewModeToggle } from "@/components/business-profile/view-mode-toggle";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useViewMode } from "@/hooks/use-view-mode";
import {
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from "@/hooks/use-products";
import type {
  Product,
  ProductDraft,
  ProductListFilters,
  ProductPayload,
} from "@/lib/api/types";
import { payloadPriceSummary, priceSummary } from "@/lib/money";
import { draftToProductPayload } from "@/lib/validation/product";

type Availability = "all" | "available" | "unavailable";

function ProductRowActions({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
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
            aria-label={ts("rowActions", { name: product.name })}
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

export function ProductsView() {
  const { business } = useBusiness();
  const t = useTranslations("knowledge.products");
  const ts = useTranslations("knowledge.shared");
  const tc = useTranslations("common");

  // Base UI's SelectValue renders the raw value unless the root knows the
  // item labels — without this the filter trigger shows e.g. "all".
  const availabilityItems: { value: Availability; label: string }[] = [
    { value: "all", label: tc("labels.all") },
    { value: "available", label: ts("available") },
    { value: "unavailable", label: ts("unavailable") },
  ];

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [availability, setAvailability] = useState<Availability>("all");

  const filters: ProductListFilters = {};
  if (debouncedSearch) filters.q = debouncedSearch;
  if (availability !== "all") filters.available = availability === "available";
  const hasFilters = debouncedSearch !== "" || availability !== "all";

  const productsQuery = useProducts(business.id, filters);
  const createProduct = useCreateProduct(business.id);
  const updateProduct = useUpdateProduct(business.id);
  const deleteProduct = useDeleteProduct(business.id);

  const [viewMode, setViewMode] = useViewMode("products");
  const [editor, setEditor] = useState<{ source: Product | null } | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [draftRows, setDraftRows] = useState<DraftRow<ProductPayload>[] | null>(null);
  const [draftEditIndex, setDraftEditIndex] = useState<number | null>(null);

  const onExtractionReady = (draft: unknown) => {
    const items = ((draft as { products?: ProductDraft[] }).products ?? []).filter(
      (item) => item.name
    );
    if (items.length === 0) {
      toast.info(ts("nothingExtracted"));
      return;
    }
    setDraftRows(toDraftRows(items.map(draftToProductPayload)));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <ExtractionDialog
              target="products"
              title={t("extract.title")}
              description={t("extract.description")}
              onReady={(extraction) => onExtractionReady(extraction.draft)}
            />
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <UploadIcon />
              {tc("actions.import")}
            </Button>
            <Button onClick={() => setEditor({ source: null })}>
              <PlusIcon />
              {t("add")}
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full sm:w-64"
          autoComplete="off"
        />
        <Select
          items={availabilityItems}
          value={availability}
          onValueChange={(value) => setAvailability((value as Availability | null) ?? "all")}
        >
          <SelectTrigger aria-label={ts("filterByAvailability")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availabilityItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} className="ms-auto" />
      </div>

      {productsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : productsQuery.isError ? (
        <ErrorState
          title={t("loadError")}
          message={productsQuery.error.message}
          onRetry={() => productsQuery.refetch()}
        />
      ) : productsQuery.data.length === 0 ? (
        hasFilters ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("noMatches")}
          </p>
        ) : (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>{t("empty.title")}</EmptyTitle>
              <EmptyDescription>{t("empty.description")}</EmptyDescription>
            </EmptyHeader>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <UploadIcon />
                {tc("actions.import")}
              </Button>
              <Button onClick={() => setEditor({ source: null })}>
                <PlusIcon />
                {t("add")}
              </Button>
            </div>
          </Empty>
        )
      ) : viewMode === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {productsQuery.data.map((product) => (
            <div
              key={product.id}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{product.name}</p>
                  {product.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {product.description}
                    </p>
                  )}
                </div>
                <ProductRowActions
                  product={product}
                  onEdit={() => setEditor({ source: product })}
                  onDelete={() => setDeleting(product)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{priceSummary(product)}</span>
                {product.agent_scope === "all" ? (
                  <span>· {ts("allAgents")}</span>
                ) : (
                  <Badge variant="secondary">
                    {ts("selectedAgents", { count: product.agent_ids.length })}
                  </Badge>
                )}
              </div>
              <div className="mt-auto flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">{ts("available")}</span>
                <Switch
                  checked={product.available}
                  aria-label={ts("toggleAvailability", { name: product.name })}
                  onCheckedChange={(checked) =>
                    updateProduct.mutate(
                      { id: product.id, payload: { available: checked } },
                      { onError: (error) => toast.error(error.message) }
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc("labels.name")}</TableHead>
                <TableHead>{ts("price")}</TableHead>
                <TableHead>{ts("agents")}</TableHead>
                <TableHead>{ts("available")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsQuery.data.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex max-w-72 flex-col">
                      <span className="truncate font-medium">{product.name}</span>
                      {product.description && (
                        <span className="truncate text-sm text-muted-foreground">
                          {product.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {priceSummary(product)}
                  </TableCell>
                  <TableCell>
                    {product.agent_scope === "all" ? (
                      <span className="text-muted-foreground">{ts("allAgents")}</span>
                    ) : (
                      <Badge variant="secondary">
                        {ts("selectedAgents", { count: product.agent_ids.length })}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.available}
                      aria-label={ts("toggleAvailability", { name: product.name })}
                      onCheckedChange={(checked) =>
                        updateProduct.mutate(
                          { id: product.id, payload: { available: checked } },
                          { onError: (error) => toast.error(error.message) }
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <ProductRowActions
                      product={product}
                      onEdit={() => setEditor({ source: product })}
                      onDelete={() => setDeleting(product)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      {editor && (
        <ProductModal
          open
          onOpenChange={(next) => {
            if (!next) setEditor(null);
          }}
          source={editor.source}
        />
      )}

      {importOpen && (
        <ImportDialog
          open
          onOpenChange={(next) => {
            if (!next) setImportOpen(false);
          }}
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
            <AlertDialogTitle>
              {t("deleteDialog.title", { name: deleting?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteProduct.mutate(deleting.id, {
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
        <DraftListReview<ProductPayload>
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
            name: item.name ?? "",
            detail: payloadPriceSummary(item),
          })}
          onEdit={(index) => setDraftEditIndex(index)}
          createItem={(item) => createProduct.mutateAsync(item)}
        />
      )}

      {draftRows && draftEditIndex !== null && (
        <ProductModal
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
