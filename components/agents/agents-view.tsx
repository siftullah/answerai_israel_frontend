"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowUpRightIcon,
  EllipsisVerticalIcon,
  PhoneIncomingIcon,
  PhoneOutgoingIcon,
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
import { ViewModeToggle } from "@/components/business-profile/view-mode-toggle";
import { AgentPurposeBadge, AgentSyncBadge } from "@/components/agents/agent-badges";
import { CreateAgentModal } from "@/components/agents/create-agent-modal";
import {
  useAgents,
  useArchiveAgent,
  useDeleteAgent,
  useRestoreAgent,
} from "@/hooks/use-agents";
import { usePhoneNumbers } from "@/hooks/use-phone-numbers";
import { useVoices } from "@/hooks/use-voices";
import { useViewMode } from "@/hooks/use-view-mode";
import { formatDate } from "@/lib/datetime";
import type { Agent, AgentStatus, PhoneNumber } from "@/lib/api/types";
import { formatE164 } from "@/lib/phone";
import { cn } from "@/lib/utils";

function StatusFilter({
  value,
  onChange,
}: {
  value: AgentStatus;
  onChange: (value: AgentStatus) => void;
}) {
  const t = useTranslations("agents");
  const tc = useTranslations("common");
  const statusOptions = [
    { value: "active", label: tc("labels.active") },
    { value: "archived", label: t("badges.archived") },
  ] as const;
  return (
    <div
      role="group"
      aria-label={t("list.filterByStatus")}
      className="flex shrink-0 items-center gap-0.5 rounded-full bg-muted p-1"
    >
      {statusOptions.map((option) => (
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

function AgentRowActions({
  agent,
  detailHref,
  onArchive,
  onRestore,
  onDelete,
}: {
  agent: Agent;
  detailHref: string;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("agents");
  const tc = useTranslations("common");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("list.actionsFor", { name: agent.name })}
          />
        }
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href={detailHref} />}>
          <ArrowUpRightIcon className="rtl:-scale-x-100" />
          {tc("actions.open")}
        </DropdownMenuItem>
        {agent.status === "archived" ? (
          <DropdownMenuItem onClick={onRestore}>
            <ArchiveRestoreIcon />
            {t("actions.restore")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onArchive}>
            <ArchiveIcon />
            {t("actions.archive")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2Icon />
          {tc("actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AgentsView() {
  const { business } = useBusiness();
  const t = useTranslations("agents");
  const tc = useTranslations("common");

  const agentsQuery = useAgents(business.id);
  const voicesQuery = useVoices(business.id);
  const numbersQuery = usePhoneNumbers(business.id);
  const archiveAgent = useArchiveAgent(business.id);
  const restoreAgent = useRestoreAgent(business.id);
  const deleteAgent = useDeleteAgent(business.id);

  const [viewMode, setViewMode] = useViewMode("agents");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgentStatus>("active");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Agent | null>(null);

  const agents = agentsQuery.data ?? [];
  const term = search.trim().toLowerCase();
  const visible = agents.filter(
    (agent) =>
      agent.status === statusFilter &&
      (term === "" ||
        agent.name.toLowerCase().includes(term) ||
        (agent.description ?? "").toLowerCase().includes(term))
  );

  const detailHref = (agent: Agent) => `/b/${business.id}/agents/${agent.id}`;

  const voiceName = (agent: Agent) => {
    const voiceId = agent.config?.voice_id;
    if (!voiceId) return "—";
    return (
      voicesQuery.data?.find((voice) => voice.id === voiceId)?.display_name ??
      t("list.unknownVoice")
    );
  };

  const routedNumbers = (agent: Agent): PhoneNumber[] =>
    (numbersQuery.data ?? []).filter(
      (number) =>
        number.inbound_agent?.id === agent.id || number.outbound_agent?.id === agent.id
    );

  const handleArchive = (agent: Agent) =>
    archiveAgent.mutate(agent.id, {
      onSuccess: () => toast.success(t("list.toasts.archived", { name: agent.name })),
      onError: (error) => toast.error(error.message),
    });

  const handleRestore = (agent: Agent) =>
    restoreAgent.mutate(agent.id, {
      onSuccess: () => toast.success(t("list.toasts.restored", { name: agent.name })),
      onError: (error) => toast.error(error.message),
    });

  const deletingNumbers = deleting ? routedNumbers(deleting) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("list.title")}
        description={t("list.description")}
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            {t("list.newAgent")}
          </Button>
        }
      />

      {agentsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : agentsQuery.isError ? (
        <ErrorState
          title={t("list.loadError")}
          message={agentsQuery.error.message}
          onRetry={() => agentsQuery.refetch()}
        />
      ) : agents.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t("list.empty.title")}</EmptyTitle>
            <EmptyDescription>{t("list.empty.description")}</EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            {t("list.newAgent")}
          </Button>
        </Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("list.searchPlaceholder")}
              className="max-w-xs"
              aria-label={t("list.searchLabel")}
            />
            <StatusFilter value={statusFilter} onChange={setStatusFilter} />
            <ViewModeToggle mode={viewMode} onChange={setViewMode} className="ms-auto" />
          </div>

          {visible.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t("list.noMatch.title")}</EmptyTitle>
                <EmptyDescription>
                  {statusFilter === "archived"
                    ? t("list.noMatch.archived")
                    : t("list.noMatch.active")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : viewMode === "cards" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((agent) => {
                const archived = agent.status === "archived";
                return (
                  <div
                    key={agent.id}
                    className="relative flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl",
                          archived
                            ? "bg-muted text-muted-foreground"
                            : agent.purpose === "outbound"
                              ? "bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400"
                              : "bg-info/10 text-info"
                        )}
                      >
                        {agent.purpose === "outbound" ? (
                          <PhoneOutgoingIcon className="size-4.5" />
                        ) : (
                          <PhoneIncomingIcon className="size-4.5" />
                        )}
                      </span>
                      <div className="relative z-10">
                        <AgentRowActions
                          agent={agent}
                          detailHref={detailHref(agent)}
                          onArchive={() => handleArchive(agent)}
                          onRestore={() => handleRestore(agent)}
                          onDelete={() => setDeleting(agent)}
                        />
                      </div>
                    </div>
                    <div className={cn("min-w-0", archived && "opacity-60")}>
                      {/* Stretched link — the whole card navigates; kebab and footer sit above it. */}
                      <Link
                        href={detailHref(agent)}
                        className="font-medium after:absolute after:inset-0 after:rounded-2xl"
                      >
                        {agent.name}
                      </Link>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {voiceName(agent)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {agent.description ?? t("list.noDescription")}
                      </p>
                    </div>
                    <div className="relative z-10 mt-auto flex items-center gap-2 border-t pt-3">
                      <AgentPurposeBadge purpose={agent.purpose} />
                      {archived ? (
                        <Badge variant="ghost">{t("badges.archived")}</Badge>
                      ) : (
                        <AgentSyncBadge status={agent.sync_status} error={agent.sync_error} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tc("labels.name")}</TableHead>
                    <TableHead>{t("list.columns.purpose")}</TableHead>
                    <TableHead>{t("list.columns.voice")}</TableHead>
                    <TableHead>{tc("labels.status")}</TableHead>
                    <TableHead>{t("list.columns.updated")}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="max-w-64">
                        <Link
                          href={detailHref(agent)}
                          className="block truncate font-medium hover:underline"
                        >
                          {agent.name}
                        </Link>
                        {agent.description && (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {agent.description}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <AgentPurposeBadge purpose={agent.purpose} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {voiceName(agent)}
                      </TableCell>
                      <TableCell>
                        {agent.status === "archived" ? (
                          <Badge variant="ghost">{t("badges.archived")}</Badge>
                        ) : (
                          <AgentSyncBadge status={agent.sync_status} error={agent.sync_error} />
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(agent.updated_at, business.timezone)}
                      </TableCell>
                      <TableCell>
                        <AgentRowActions
                          agent={agent}
                          detailHref={detailHref(agent)}
                          onArchive={() => handleArchive(agent)}
                          onRestore={() => handleRestore(agent)}
                          onDelete={() => setDeleting(agent)}
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

      {creating && (
        <CreateAgentModal
          open
          onOpenChange={(next) => {
            if (!next) setCreating(false);
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
            <AlertDialogTitle>{t("deleteDialog.title", { name: deleting?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description")}
              {deletingNumbers.length > 0 && (
                <>
                  {" "}
                  {t("deleteDialog.routedNumbers", {
                    count: deletingNumbers.length,
                    numbers: deletingNumbers.map((number) => formatE164(number.e164)).join(", "),
                  })}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteAgent.mutate(deleting.id, {
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
    </div>
  );
}
