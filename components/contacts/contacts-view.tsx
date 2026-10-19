"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { DownloadIcon, PlusIcon, UploadIcon } from "lucide-react";
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
import { PageHeader } from "@/components/layout/page-header";
import { useBusiness } from "@/components/business/business-provider";
import { ViewModeToggle } from "@/components/business-profile/view-mode-toggle";
import { BulkActionBar } from "@/components/contacts/bulk-action-bar";
import { ContactEditorDialog } from "@/components/contacts/contact-editor-dialog";
import { ContactImportDialog } from "@/components/contacts/contact-import-dialog";
import { ContactsCards } from "@/components/contacts/contacts-cards";
import { ContactsTable, type ContactListSelection } from "@/components/contacts/contacts-table";
import { contactDisplayName } from "@/components/contacts/contact-display";
import { AddDncDialog } from "@/components/contacts/dnc/add-dnc-dialog";
import { useContactSelection } from "@/components/contacts/use-contact-selection";
import { useContactsInfinite, useContactTags, useDeleteContact } from "@/hooks/use-contacts";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useViewMode } from "@/hooks/use-view-mode";
import type { Contact, ContactListFilters, ContactSource } from "@/lib/api/types";
import { endpoints } from "@/lib/api/endpoints";
import { downloadFile } from "@/lib/api/download";
import { cn } from "@/lib/utils";

type SourceFilter = "all" | ContactSource;
type NameFilter = "all" | "named" | "unnamed";

/** Segmented pill group (agents StatusFilter recipe) — isolates the
 * nameless AI-created backlog. */
function NameFilterGroup({
  value,
  onChange,
}: {
  value: NameFilter;
  onChange: (value: NameFilter) => void;
}) {
  const t = useTranslations("contacts.list");
  const tc = useTranslations("common");
  const options: { value: NameFilter; label: string }[] = [
    { value: "all", label: tc("labels.all") },
    { value: "named", label: t("named") },
    { value: "unnamed", label: t("unnamed") },
  ];

  return (
    <div
      role="group"
      aria-label={t("filterByName")}
      className="flex shrink-0 items-center gap-0.5 rounded-full bg-muted p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            value === option.value
              ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ContactsView() {
  const t = useTranslations("contacts");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Base UI's SelectValue renders the raw value unless the root knows the
  // item labels — without this the filter trigger shows e.g. "all".
  const sourceItems: { value: SourceFilter; label: string }[] = [
    { value: "all", label: t("allSources") },
    { value: "manual", label: t("source.manual") },
    { value: "ai", label: t("list.capturedByAi") },
  ];

  // Legacy deep link: call detail used to link to /contacts?contact={uuid}.
  const legacyContact = searchParams.get("contact");
  useEffect(() => {
    if (legacyContact) {
      router.replace(`/b/${business.id}/contacts/${legacyContact}`);
    }
  }, [legacyContact, business.id, router]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [source, setSource] = useState<SourceFilter>("all");
  const [tag, setTag] = useState("all");
  const [nameFilter, setNameFilter] = useState<NameFilter>("all");

  // Conditional spreads so empty filters never appear as query-key segments.
  const apiFilters = useMemo<ContactListFilters>(
    () => ({
      ...(debouncedSearch !== "" ? { q: debouncedSearch } : {}),
      ...(source !== "all" ? { source } : {}),
      ...(tag !== "all" ? { tag } : {}),
      ...(nameFilter !== "all" ? { has_name: nameFilter === "named" } : {}),
    }),
    [debouncedSearch, source, tag, nameFilter]
  );
  const hasFilters = Object.keys(apiFilters).length > 0;
  const filtersKey = JSON.stringify(apiFilters);

  const contactsQuery = useContactsInfinite(business.id, apiFilters);
  const tagsQuery = useContactTags(business.id);
  const deleteContact = useDeleteContact(business.id);

  const allTagsLabel = t("list.allTags");
  const tagItems = useMemo(
    () => [
      { value: "all", label: allTagsLabel },
      ...(tagsQuery.data ?? []).map((value) => ({ value, label: value })),
    ],
    [tagsQuery.data, allTagsLabel]
  );

  const [viewMode, setViewMode] = useViewMode("contacts");
  const [editor, setEditor] = useState<{ source: Contact | null } | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [dncPrefill, setDncPrefill] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = contactsQuery;
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
        endpoints.contacts.export,
        { ...apiFilters, has_name: apiFilters.has_name === undefined ? undefined : apiFilters.has_name ? 1 : 0 },
        `contacts-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const contacts = contactsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const loadedIds = contacts.map((contact) => contact.id);

  const selectionApi = useContactSelection(filtersKey);
  const allLoadedSelected =
    contacts.length > 0 && loadedIds.every((id) => selectionApi.isSelected(id));
  const listSelection: ContactListSelection = {
    isSelected: selectionApi.isSelected,
    onToggleRow: (id) => selectionApi.toggle(id, loadedIds),
    onToggleAll: () => selectionApi.togglePage(loadedIds),
    headerChecked: allLoadedSelected,
    headerIndeterminate: !allLoadedSelected && selectionApi.active,
  };

  const listProps = {
    contacts,
    businessUuid: business.id,
    timeZone: business.timezone,
    selection: listSelection,
    onEdit: (contact: Contact) => setEditor({ source: contact }),
    onAddToDnc: (e164: string) => setDncPrefill(e164),
    onDelete: (contact: Contact) => setDeleting(contact),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("list.title")}
        description={t("list.description")}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={exporting}>
              {exporting ? <Spinner /> : <DownloadIcon />}
              {tc("actions.export")}
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <UploadIcon />
              {tc("actions.import")}
            </Button>
            <Button onClick={() => setEditor({ source: null })}>
              <PlusIcon />
              {t("addContact")}
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("list.searchPlaceholder")}
          className="w-full sm:w-72"
          autoComplete="off"
        />
        <Select
          items={sourceItems}
          value={source}
          onValueChange={(value) => setSource((value as SourceFilter | null) ?? "all")}
        >
          <SelectTrigger aria-label={t("filterBySource")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sourceItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={tagItems}
          value={tag}
          onValueChange={(value) => setTag((value as string | null) ?? "all")}
        >
          <SelectTrigger aria-label={t("list.filterByTag")}>
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
        <NameFilterGroup value={nameFilter} onChange={setNameFilter} />
        <ViewModeToggle mode={viewMode} onChange={setViewMode} className="ms-auto" />
      </div>

      {contactsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : contactsQuery.isError ? (
        <ErrorState
          title={t("list.loadError")}
          message={contactsQuery.error.message}
          onRetry={() => contactsQuery.refetch()}
        />
      ) : contacts.length === 0 ? (
        hasFilters ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("list.noMatch")}</p>
        ) : (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>{t("list.emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("list.emptyDescription")}</EmptyDescription>
            </EmptyHeader>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <UploadIcon />
                {tc("actions.import")}
              </Button>
              <Button onClick={() => setEditor({ source: null })}>
                <PlusIcon />
                {t("addContact")}
              </Button>
            </div>
          </Empty>
        )
      ) : (
        <>
          {viewMode === "cards" ? <ContactsCards {...listProps} /> : <ContactsTable {...listProps} />}
          {hasNextPage && <div ref={sentinelRef} aria-hidden className="h-px" />}
          {isFetchingNextPage && (
            <div className="flex justify-center py-3">
              <Spinner className="size-4" />
            </div>
          )}
          {selectionApi.active && (
            <BulkActionBar
              selection={selectionApi.selection}
              count={selectionApi.count}
              filters={apiFilters}
              showSelectAllMatching={
                selectionApi.selection.mode === "explicit" &&
                allLoadedSelected &&
                Boolean(hasNextPage)
              }
              onSelectAllMatching={selectionApi.enterAllMatching}
              onClear={selectionApi.clear}
            />
          )}
        </>
      )}

      {editor && (
        <ContactEditorDialog
          open
          onOpenChange={(next) => {
            if (!next) setEditor(null);
          }}
          source={editor.source}
        />
      )}

      {importOpen && (
        <ContactImportDialog
          open
          onOpenChange={(next) => {
            if (!next) setImportOpen(false);
          }}
        />
      )}

      {dncPrefill !== null && (
        <AddDncDialog
          open
          onOpenChange={(next) => {
            if (!next) setDncPrefill(null);
          }}
          prefill={{ e164: dncPrefill }}
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
              {t("delete.title", { name: deleting ? contactDisplayName(deleting) : "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("delete.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteContact.mutate(deleting.id, {
                  onSuccess: () => toast.success(t("delete.toast")),
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
    </div>
  );
}
