"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
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
import { Label } from "@/components/ui/label";
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
import { DataTableShell } from "@/components/business-profile/data-table-shell";
import { ViewModeToggle } from "@/components/business-profile/view-mode-toggle";
import { useBusiness } from "@/components/business/business-provider";
import { EditNumberModal } from "@/components/phone-numbers/edit-number-modal";
import { NumberStatusBadge } from "@/components/phone-numbers/number-status-badge";
import {
  usePhoneNumbers,
  useReleasePhoneNumber,
  useRetryPhoneNumber,
} from "@/hooks/use-phone-numbers";
import { useViewMode } from "@/hooks/use-view-mode";
import { formatE164 } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { PhoneNumber, PhoneNumberProvider, PhoneNumberType } from "@/lib/api/types";

function NumberRowActions({
  number,
  onEdit,
  onRetry,
  onRelease,
}: {
  number: PhoneNumber;
  onEdit: () => void;
  onRetry: () => void;
  onRelease: () => void;
}) {
  const t = useTranslations("phoneNumbers.numbers");
  const tc = useTranslations("common");
  const canEdit = number.status === "active";
  const canRetry = number.status === "error" && number.provider === "twilio";
  const canRelease = number.status !== "releasing" && number.status !== "released";

  if (!canEdit && !canRetry && !canRelease) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("rowActions", { number: formatE164(number.e164) })}
          />
        }
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon />
            {tc("actions.edit")}
          </DropdownMenuItem>
        )}
        {canRetry && (
          <DropdownMenuItem onClick={onRetry}>
            <RotateCcwIcon />
            {t("retryPurchase")}
          </DropdownMenuItem>
        )}
        {canRelease && (
          <DropdownMenuItem variant="destructive" onClick={onRelease}>
            <Trash2Icon />
            {t("release")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The number plus its secondary line: friendly name, or the provisioning error. */
function NumberCell({ number }: { number: PhoneNumber }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium">{formatE164(number.e164)}</p>
      {number.status === "error" && number.error ? (
        <p className="truncate text-sm text-destructive">{number.error}</p>
      ) : number.friendly_name ? (
        <p className="truncate text-sm text-muted-foreground">{number.friendly_name}</p>
      ) : null}
    </div>
  );
}

export function NumbersTab({
  onBuy,
  onAddSip,
}: {
  onBuy: () => void;
  onAddSip: () => void;
}) {
  const t = useTranslations("phoneNumbers");
  const tc = useTranslations("common");
  const { business } = useBusiness();

  const numbersQuery = usePhoneNumbers(business.id);
  const release = useReleasePhoneNumber(business.id);
  const retry = useRetryPhoneNumber(business.id);

  const providerLabels: Record<PhoneNumberProvider, string> = {
    twilio: t("provider.twilio"),
    byo_sip: t("provider.byoSip"),
  };
  const typeLabels: Record<PhoneNumberType, string> = {
    local: t("numberType.local"),
    mobile: t("numberType.mobile"),
    toll_free: t("numberType.tollFree"),
  };

  const [viewMode, setViewMode] = useViewMode("phone-numbers");
  const [showReleased, setShowReleased] = useState(false);
  const [editing, setEditing] = useState<PhoneNumber | null>(null);
  const [releasing, setReleasing] = useState<PhoneNumber | null>(null);

  const numbers = numbersQuery.data ?? [];
  const visible = showReleased
    ? numbers
    : numbers.filter((number) => number.status !== "released");

  const handleRetry = (number: PhoneNumber) => {
    retry.mutate(number.id, {
      onSuccess: () => toast.success(t("toasts.retrying")),
      onError: (error) => toast.error(error.message),
    });
  };

  const agentName = (number: PhoneNumber, slot: "inbound" | "outbound") => {
    if (slot === "outbound" && number.provider === "byo_sip") return "—";
    const agent = slot === "inbound" ? number.inbound_agent : number.outbound_agent;
    return agent?.name ?? "—";
  };

  if (numbersQuery.isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (numbersQuery.isError) {
    return (
      <ErrorState
        title={t("numbers.loadError")}
        message={numbersQuery.error.message}
        onRetry={() => numbersQuery.refetch()}
      />
    );
  }

  if (numbers.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyTitle>{t("numbers.empty.title")}</EmptyTitle>
          <EmptyDescription>{t("numbers.empty.description")}</EmptyDescription>
        </EmptyHeader>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={onBuy}>
            <PlusIcon />
            {t("page.buyNumber")}
          </Button>
          <Button variant="cta" onClick={onAddSip}>
            <PlusIcon />
            {t("page.addSipNumber")}
          </Button>
        </div>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="show-released"
            checked={showReleased}
            onCheckedChange={(checked) => setShowReleased(checked === true)}
          />
          <Label htmlFor="show-released" className="text-sm text-muted-foreground">
            {t("numbers.showReleased")}
          </Label>
        </div>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("numbers.allReleased")}
        </p>
      ) : viewMode === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((number) => (
            <div
              key={number.id}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border bg-card p-4",
                number.status === "released" && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <NumberCell number={number} />
                <NumberRowActions
                  number={number}
                  onEdit={() => setEditing(number)}
                  onRetry={() => handleRetry(number)}
                  onRelease={() => setReleasing(number)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("numbers.agentsLine", {
                  inbound: agentName(number, "inbound"),
                  outbound: agentName(number, "outbound"),
                })}
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">
                <NumberStatusBadge status={number.status} />
                <Badge variant="outline">{providerLabels[number.provider]}</Badge>
                <Badge variant="info">{typeLabels[number.number_type]}</Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("numbers.columns.number")}</TableHead>
                <TableHead>{t("numbers.columns.provider")}</TableHead>
                <TableHead>{t("numbers.columns.type")}</TableHead>
                <TableHead>{tc("labels.status")}</TableHead>
                <TableHead>{t("agentSlot.inbound")}</TableHead>
                <TableHead>{t("agentSlot.outbound")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((number) => (
                <TableRow
                  key={number.id}
                  className={cn(number.status === "released" && "opacity-60")}
                >
                  <TableCell>
                    <NumberCell number={number} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{providerLabels[number.provider]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">{typeLabels[number.number_type]}</Badge>
                  </TableCell>
                  <TableCell>
                    <NumberStatusBadge status={number.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {agentName(number, "inbound")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {agentName(number, "outbound")}
                  </TableCell>
                  <TableCell>
                    <NumberRowActions
                      number={number}
                      onEdit={() => setEditing(number)}
                      onRetry={() => handleRetry(number)}
                      onRelease={() => setReleasing(number)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      {editing && (
        <EditNumberModal
          open
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
          number={editing}
        />
      )}

      <AlertDialog
        open={releasing !== null}
        onOpenChange={(next) => {
          if (!next) setReleasing(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("release.title", {
                number: releasing ? formatE164(releasing.e164) : t("release.thisNumber"),
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {releasing?.provider === "byo_sip"
                ? t("release.descriptionSip")
                : t("release.descriptionPlatform")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!releasing) return;
                const provider = releasing.provider;
                release.mutate(releasing.id, {
                  onSuccess: () =>
                    toast.success(
                      provider === "byo_sip" ? t("toasts.released") : t("toasts.releasing")
                    ),
                  onError: (error) => toast.error(error.message),
                });
                setReleasing(null);
              }}
            >
              {t("release.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
