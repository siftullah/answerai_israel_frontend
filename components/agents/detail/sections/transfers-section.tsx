"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowUpRightIcon,
  EllipsisVerticalIcon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useBusiness } from "@/components/business/business-provider";
import { ChoiceCards } from "@/components/business-profile/choice-cards";
import { DataTableShell } from "@/components/business-profile/data-table-shell";
import { TransferTargetModal } from "@/components/business-profile/transfers/transfer-target-modal";
import { AgentSection } from "@/components/agents/detail/agent-section";
import { useMembers } from "@/hooks/use-members";
import {
  useCreateTransferTarget,
  useDeleteTransferTarget,
  useSetTransferMode,
  useTransferTargets,
} from "@/hooks/use-transfer-targets";
import { HOURS_MODE_LABELS } from "@/lib/api/types";
import type { Agent, TransferMode, TransferTarget } from "@/lib/api/types";
import { formatE164 } from "@/lib/phone";
import {
  toTransferTargetPayload,
  toTransferTargetValues,
} from "@/lib/validation/transfer-target";

export function TransfersSection({ agent }: { agent: Agent }) {
  const t = useTranslations("agents.sections.transfers");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const archived = agent.status === "archived";

  const ownQuery = useTransferTargets(business.id, agent.id);
  const businessQuery = useTransferTargets(business.id);
  const membersQuery = useMembers(business.id);
  const createTarget = useCreateTransferTarget(business.id);
  const deleteTarget = useDeleteTransferTarget(business.id);
  const setMode = useSetTransferMode(business.id, agent.id);

  const [localMode, setLocalMode] = useState<TransferMode>("blind");
  const [pendingMode, setPendingMode] = useState<TransferMode | null>(null);
  const [customising, setCustomising] = useState(false);
  const [copying, setCopying] = useState<{ done: number; total: number } | null>(null);
  const [editor, setEditor] = useState<{ target: TransferTarget | null } | null>(null);
  const [deleting, setDeleting] = useState<TransferTarget | null>(null);
  const [reverting, setReverting] = useState(false);
  const [revertBusy, setRevertBusy] = useState(false);

  const own = ownQuery.data ?? [];
  const businessTargets = businessQuery.data ?? [];
  const customised = own.length > 0;
  const scopeMode: TransferMode = own[0]?.mode ?? localMode;
  const businessMode: TransferMode = businessTargets[0]?.mode ?? "blind";

  const memberName = (target: TransferTarget) =>
    target.business_member
      ? (membersQuery.data?.find((m) => m.id === target.business_member?.id)?.name ??
        t("teamMember"))
      : null;

  const destination = (target: TransferTarget) => {
    const name = memberName(target);
    if (target.to_e164 && name) {
      return t("overrides", { number: formatE164(target.to_e164), name });
    }
    return target.to_e164 ? formatE164(target.to_e164) : (name ?? "—");
  };

  const copyBusinessDirectory = async () => {
    setCustomising(false);
    setCopying({ done: 0, total: businessTargets.length });
    try {
      for (const [index, target] of businessTargets.entries()) {
        await createTarget.mutateAsync({
          ...toTransferTargetPayload(toTransferTargetValues(target), businessMode),
          agent_id: agent.id,
        });
        setCopying({ done: index + 1, total: businessTargets.length });
      }
      toast.success(t("toasts.copied", { count: businessTargets.length }));
    } catch (error) {
      // Already-copied entries remain: the section lands in the customised
      // state where the rest can be added manually.
      toast.error(error instanceof Error ? error.message : t("toasts.copyFailed"));
      void ownQuery.refetch();
    } finally {
      setCopying(null);
    }
  };

  const revertToBusiness = async () => {
    setReverting(false);
    setRevertBusy(true);
    try {
      for (const target of own) {
        await deleteTarget.mutateAsync(target.id);
      }
      toast.success(t("toasts.reverted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toasts.revertFailed"));
      void ownQuery.refetch();
    } finally {
      setRevertBusy(false);
    }
  };

  const requestMode = (mode: TransferMode) => {
    if (mode === scopeMode) return;
    if (own.length === 0) {
      setLocalMode(mode);
      return;
    }
    setPendingMode(mode);
  };

  return (
    <AgentSection
      id="transfers"
      title={t("title")}
      description={t("description")}
      actions={
        customised && !archived ? (
          <Button type="button" variant="cta" size="sm" onClick={() => setEditor({ target: null })}>
            <PlusIcon />
            {t("addTarget")}
          </Button>
        ) : undefined
      }
    >
      {ownQuery.isPending || businessQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : ownQuery.isError ? (
        <ErrorState
          title={t("loadError")}
          message={ownQuery.error.message}
          onRetry={() => ownQuery.refetch()}
        />
      ) : !customised ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-muted/40 p-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{t("usingBusiness")}</p>
              <Badge variant="secondary">
                {businessMode === "screened" ? t("mode.screened") : t("mode.blind")}
              </Badge>
            </div>
            {businessTargets.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t("noBusinessTargets")}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-1.5">
                {businessTargets.slice(0, 5).map((target) => (
                  <li key={target.id} className="flex items-baseline gap-2 text-sm">
                    <span className="font-medium">{target.name}</span>
                    <span className="truncate text-muted-foreground">
                      {destination(target)}
                    </span>
                  </li>
                ))}
                {businessTargets.length > 5 && (
                  <li className="text-sm text-muted-foreground">
                    {t("andMore", { count: businessTargets.length - 5 })}
                  </li>
                )}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!archived && (
              <Button
                type="button"
                size="sm"
                disabled={copying !== null}
                onClick={() =>
                  businessTargets.length > 0 ? setCustomising(true) : setEditor({ target: null })
                }
              >
                {copying && <Spinner />}
                {copying
                  ? t("copying", { done: copying.done, total: copying.total })
                  : t("customise")}
              </Button>
            )}
            <Button
              variant="cta"
              size="sm"
              render={<Link href={`/b/${business.id}/business-profile/transfers`} />}
            >
              {t("editBusinessDirectory")}
              <ArrowUpRightIcon className="rtl:-scale-x-100" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">{t("ownDirectory")}</p>

          <ChoiceCards
            value={scopeMode}
            onChange={(value) => {
              if (!archived) requestMode(value);
            }}
            className="max-w-xl"
            options={[
              {
                value: "blind",
                label: t("mode.blind"),
                description: t("mode.blindDescription"),
              },
              {
                value: "screened",
                label: t("mode.screened"),
                description: t("mode.screenedDescription"),
              },
            ]}
          />

          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc("labels.name")}</TableHead>
                  <TableHead>{t("columns.destination")}</TableHead>
                  <TableHead>{t("columns.when")}</TableHead>
                  <TableHead>{t("columns.hours")}</TableHead>
                  {!archived && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {own.map((target) => (
                  <TableRow key={target.id}>
                    <TableCell className="font-medium">{target.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {destination(target)}
                    </TableCell>
                    <TableCell>
                      <span className="line-clamp-1 max-w-72 text-muted-foreground">
                        {target.condition}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {HOURS_MODE_LABELS[target.hours_mode]}
                    </TableCell>
                    {!archived && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={t("actionsFor", { name: target.name })}
                              />
                            }
                          >
                            <EllipsisVerticalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditor({ target })}>
                              <PencilIcon />
                              {tc("actions.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleting(target)}
                            >
                              <Trash2Icon />
                              {tc("actions.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>

          {!archived && (
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={revertBusy}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setReverting(true)}
              >
                {revertBusy && <Spinner />}
                {t("revert")}
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={customising} onOpenChange={setCustomising}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("customiseDialog.title")}</DialogTitle>
            <DialogDescription>{t("customiseDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyBusinessDirectory()}
            >
              {t("customiseDialog.copy", { count: businessTargets.length })}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCustomising(false);
                setEditor({ target: null });
              }}
            >
              {t("customiseDialog.startEmpty")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {editor && (
        <TransferTargetModal
          open
          onOpenChange={(next) => {
            if (!next) setEditor(null);
          }}
          target={editor.target}
          scopeMode={scopeMode}
          agentId={agent.id}
        />
      )}

      <AlertDialog
        open={pendingMode !== null}
        onOpenChange={(next) => {
          if (!next) setPendingMode(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("switchDialog.title", { mode: pendingMode ?? "blind" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("switchDialog.description", { count: own.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingMode) return;
                setMode.mutate(pendingMode, {
                  onSuccess: (result) => toast.success(result.message),
                  onError: (error) => toast.error(error.message),
                });
                setPendingMode(null);
              }}
            >
              {t("switchDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <AlertDialogDescription>
              {own.length === 1 ? t("deleteDialog.last") : t("deleteDialog.other")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteTarget.mutate(deleting.id, {
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

      <AlertDialog open={reverting} onOpenChange={setReverting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revertDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("revertDialog.description", { count: own.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void revertToBusiness()}>
              {t("revertDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AgentSection>
  );
}
