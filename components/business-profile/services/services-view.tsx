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
import { ServiceModal } from "@/components/business-profile/services/service-modal";
import { ViewModeToggle } from "@/components/business-profile/view-mode-toggle";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useViewMode } from "@/hooks/use-view-mode";
import {
  useCreateService,
  useDeleteService,
  useServices,
  useUpdateService,
} from "@/hooks/use-services";
import type {
  Service,
  ServiceDraft,
  ServiceListFilters,
  ServicePayload,
} from "@/lib/api/types";
import { durationSummary, payloadPriceSummary, priceSummary } from "@/lib/money";
import { draftToServicePayload } from "@/lib/validation/service";

type Availability = "all" | "available" | "unavailable";

// Base UI's SelectValue renders the raw value unless the root knows the
// item labels — without this the filter trigger shows e.g. "all".
const AVAILABILITY_ITEMS: { value: Availability; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "unavailable", label: "Unavailable" },
];

function ServiceRowActions({
  service,
  onEdit,
  onDelete,
}: {
  service: Service;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${service.name}`} />
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

export function ServicesView() {
  const { business } = useBusiness();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [availability, setAvailability] = useState<Availability>("all");

  const filters: ServiceListFilters = {};
  if (debouncedSearch) filters.q = debouncedSearch;
  if (availability !== "all") filters.available = availability === "available";
  const hasFilters = debouncedSearch !== "" || availability !== "all";

  const servicesQuery = useServices(business.id, filters);
  const createService = useCreateService(business.id);
  const updateService = useUpdateService(business.id);
  const deleteService = useDeleteService(business.id);

  const [viewMode, setViewMode] = useViewMode("services");
  const [editor, setEditor] = useState<{ source: Service | null } | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);

  const [draftRows, setDraftRows] = useState<DraftRow<ServicePayload>[] | null>(null);
  const [draftEditIndex, setDraftEditIndex] = useState<number | null>(null);

  const onExtractionReady = (draft: unknown) => {
    const items = ((draft as { services?: ServiceDraft[] }).services ?? []).filter(
      (item) => item.name
    );
    if (items.length === 0) {
      toast.info("Nothing usable was extracted from that source.");
      return;
    }
    setDraftRows(toDraftRows(items.map(draftToServicePayload)));
  };

  const rowSummary = (service: Service) => {
    const duration = durationSummary(service);
    return duration ? `${priceSummary(service)} · ${duration}` : priceSummary(service);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Services"
        description="What your business offers and how your AI talks about it."
        actions={
          <>
            <ExtractionDialog
              target="services"
              title="Extract services"
              description="Pull your service list from your website or a document. You review every row before anything is added."
              onReady={(extraction) => onExtractionReady(extraction.draft)}
            />
            <Button onClick={() => setEditor({ source: null })}>
              <PlusIcon />
              Add service
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search services"
          className="w-full sm:w-64"
          autoComplete="off"
        />
        <Select
          items={AVAILABILITY_ITEMS}
          value={availability}
          onValueChange={(value) => setAvailability((value as Availability | null) ?? "all")}
        >
          <SelectTrigger aria-label="Filter by availability">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AVAILABILITY_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} className="ml-auto" />
      </div>

      {servicesQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : servicesQuery.isError ? (
        <ErrorState
          title="Couldn't load services"
          message={servicesQuery.error.message}
          onRetry={() => servicesQuery.refetch()}
        />
      ) : servicesQuery.data.length === 0 ? (
        hasFilters ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No services match your search.
          </p>
        ) : (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>Add your first service</EmptyTitle>
              <EmptyDescription>
                Services tell your AI what the business offers, what it costs and how long
                it takes.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => setEditor({ source: null })}>
              <PlusIcon />
              Add service
            </Button>
          </Empty>
        )
      ) : viewMode === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {servicesQuery.data.map((service) => (
            <div
              key={service.id}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{service.name}</p>
                  {service.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  )}
                </div>
                <ServiceRowActions
                  service={service}
                  onEdit={() => setEditor({ source: service })}
                  onDelete={() => setDeleting(service)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{rowSummary(service)}</span>
                {service.agent_scope === "all" ? (
                  <span>· All agents</span>
                ) : (
                  <Badge variant="secondary">{service.agent_ids.length} selected</Badge>
                )}
              </div>
              <div className="mt-auto flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">Available</span>
                <Switch
                  checked={service.available}
                  aria-label={`Toggle availability of ${service.name}`}
                  onCheckedChange={(checked) =>
                    updateService.mutate(
                      { id: service.id, payload: { available: checked } },
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
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicesQuery.data.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="flex max-w-72 flex-col">
                      <span className="truncate font-medium">{service.name}</span>
                      {service.description && (
                        <span className="truncate text-sm text-muted-foreground">
                          {service.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rowSummary(service)}
                  </TableCell>
                  <TableCell>
                    {service.agent_scope === "all" ? (
                      <span className="text-muted-foreground">All agents</span>
                    ) : (
                      <Badge variant="secondary">{service.agent_ids.length} selected</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={service.available}
                      aria-label={`Toggle availability of ${service.name}`}
                      onCheckedChange={(checked) =>
                        updateService.mutate(
                          { id: service.id, payload: { available: checked } },
                          { onError: (error) => toast.error(error.message) }
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <ServiceRowActions
                      service={service}
                      onEdit={() => setEditor({ source: service })}
                      onDelete={() => setDeleting(service)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      {editor && (
        <ServiceModal
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
              Your AI will no longer know about this service. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteService.mutate(deleting.id, {
                  onSuccess: () => toast.success("Service deleted"),
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
        <DraftListReview<ServicePayload>
          open
          onOpenChange={(next) => {
            if (!next) setDraftRows(null);
          }}
          title="Review extracted services"
          itemNoun="service"
          rows={draftRows}
          onRowsChange={setDraftRows}
          summary={(item) => ({
            name: item.name ?? "",
            detail: payloadPriceSummary(item),
          })}
          onEdit={(index) => setDraftEditIndex(index)}
          createItem={(item) => createService.mutateAsync(item)}
        />
      )}

      {draftRows && draftEditIndex !== null && (
        <ServiceModal
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
