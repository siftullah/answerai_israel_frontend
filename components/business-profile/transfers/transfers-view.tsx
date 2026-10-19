"use client";

import { useState } from "react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ChoiceCards } from "@/components/business-profile/choice-cards";
import { DataTableShell } from "@/components/business-profile/data-table-shell";
import { TransferTargetModal } from "@/components/business-profile/transfers/transfer-target-modal";
import { ViewModeToggle } from "@/components/business-profile/view-mode-toggle";
import { useMembers } from "@/hooks/use-members";
import { useViewMode } from "@/hooks/use-view-mode";
import {
  useDeleteTransferTarget,
  useSetTransferMode,
  useTransferTargets,
} from "@/hooks/use-transfer-targets";
import { HOURS_MODE_LABELS } from "@/lib/api/types";
import type { TransferMode, TransferTarget } from "@/lib/api/types";
import { formatE164 } from "@/lib/phone";

function TransferRowActions({
  target,
  onEdit,
  onDelete,
}: {
  target: TransferTarget;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("businessProfile.transfers");
  const tc = useTranslations("common");
  return (
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

export function TransfersView() {
  const t = useTranslations("businessProfile.transfers");
  const tc = useTranslations("common");
  const { business } = useBusiness();

  const targetsQuery = useTransferTargets(business.id);
  const membersQuery = useMembers(business.id);
  const setMode = useSetTransferMode(business.id);
  const deleteTarget = useDeleteTransferTarget(business.id);

  const [viewMode, setViewMode] = useViewMode("transfers");
  const [localMode, setLocalMode] = useState<TransferMode>("blind");
  const [pendingMode, setPendingMode] = useState<TransferMode | null>(null);
  const [editor, setEditor] = useState<{ target: TransferTarget | null } | null>(null);
  const [deleting, setDeleting] = useState<TransferTarget | null>(null);

  const targets = targetsQuery.data ?? [];
  const scopeMode: TransferMode = targets[0]?.mode ?? localMode;

  const memberName = (target: TransferTarget) =>
    target.business_member
      ? (membersQuery.data?.find((m) => m.id === target.business_member?.id)?.name ??
        t("memberFallback"))
      : null;

  const destination = (target: TransferTarget) => {
    const name = memberName(target);
    if (target.to_e164 && name) {
      return t("overrides", { number: formatE164(target.to_e164), name });
    }
    return target.to_e164 ? formatE164(target.to_e164) : (name ?? "—");
  };

  const requestMode = (mode: TransferMode) => {
    if (mode === scopeMode) return;
    if (targets.length === 0) {
      setLocalMode(mode);
      return;
    }
    setPendingMode(mode);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button onClick={() => setEditor({ target: null })}>
            <PlusIcon />
            {t("addTarget")}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("mode.title")}</CardTitle>
          <CardDescription>{t("mode.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChoiceCards
            value={scopeMode}
            onChange={(value) => requestMode(value)}
            className="max-w-xl"
            options={[
              {
                value: "blind",
                label: t("mode.blind"),
                description: t("mode.blindHint"),
              },
              {
                value: "screened",
                label: t("mode.screened"),
                description: t("mode.screenedHint"),
              },
            ]}
          />
        </CardContent>
      </Card>

      {targetsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : targetsQuery.isError ? (
        <ErrorState
          title={t("loadError")}
          message={targetsQuery.error.message}
          onRetry={() => targetsQuery.refetch()}
        />
      ) : targets.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t("empty.title")}</EmptyTitle>
            <EmptyDescription>{t("empty.description")}</EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setEditor({ target: null })}>
            <PlusIcon />
            {t("addTarget")}
          </Button>
        </Empty>
      ) : (
        <>
          <div className="flex justify-end">
            <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          </div>
          {viewMode === "cards" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {targets.map((target) => (
                <div
                  key={target.id}
                  className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{target.name}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {destination(target)}
                      </p>
                    </div>
                    <TransferRowActions
                      target={target}
                      onEdit={() => setEditor({ target })}
                      onDelete={() => setDeleting(target)}
                    />
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {target.condition}
                  </p>
                  <div className="mt-auto flex items-center gap-2 border-t pt-3">
                    <Badge variant="secondary">{HOURS_MODE_LABELS[target.hours_mode]}</Badge>
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
                <TableHead>{t("columns.destination")}</TableHead>
                <TableHead>{t("columns.when")}</TableHead>
                <TableHead>{t("columns.hours")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((target) => (
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
                  <TableCell>
                    <TransferRowActions
                      target={target}
                      onEdit={() => setEditor({ target })}
                      onDelete={() => setDeleting(target)}
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
        <TransferTargetModal
          open
          onOpenChange={(next) => {
            if (!next) setEditor(null);
          }}
          target={editor.target}
          scopeMode={scopeMode}
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
              {t("switchDialog.description", { count: targets.length })}
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
            <AlertDialogDescription>{t("deleteDialog.description")}</AlertDialogDescription>
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
    </div>
  );
}
