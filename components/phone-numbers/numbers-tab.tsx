"use client";

import { useState } from "react";
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

const PROVIDER_LABELS: Record<PhoneNumberProvider, string> = {
  twilio: "Platform",
  byo_sip: "BYO SIP",
};

const TYPE_LABELS: Record<PhoneNumberType, string> = {
  local: "Local",
  mobile: "Mobile",
  toll_free: "Toll-free",
};

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
            aria-label={`Actions for ${formatE164(number.e164)}`}
          />
        }
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
        )}
        {canRetry && (
          <DropdownMenuItem onClick={onRetry}>
            <RotateCcwIcon />
            Retry purchase
          </DropdownMenuItem>
        )}
        {canRelease && (
          <DropdownMenuItem variant="destructive" onClick={onRelease}>
            <Trash2Icon />
            Release
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
  const { business } = useBusiness();

  const numbersQuery = usePhoneNumbers(business.id);
  const release = useReleasePhoneNumber(business.id);
  const retry = useRetryPhoneNumber(business.id);

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
      onSuccess: () => toast.success("Retrying purchase"),
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
        title="Couldn't load phone numbers"
        message={numbersQuery.error.message}
        onRetry={() => numbersQuery.refetch()}
      />
    );
  }

  if (numbers.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyTitle>Get your first phone number</EmptyTitle>
          <EmptyDescription>
            Buy a number for your AI to answer, or bring your own over a SIP trunk.
          </EmptyDescription>
        </EmptyHeader>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={onBuy}>
            <PlusIcon />
            Buy number
          </Button>
          <Button variant="cta" onClick={onAddSip}>
            <PlusIcon />
            Add SIP number
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
            Show released
          </Label>
        </div>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          All your numbers have been released.
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
                In: {agentName(number, "inbound")} · Out: {agentName(number, "outbound")}
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">
                <NumberStatusBadge status={number.status} />
                <Badge variant="outline">{PROVIDER_LABELS[number.provider]}</Badge>
                <Badge variant="info">{TYPE_LABELS[number.number_type]}</Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Inbound agent</TableHead>
                <TableHead>Outbound agent</TableHead>
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
                    <Badge variant="outline">{PROVIDER_LABELS[number.provider]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">{TYPE_LABELS[number.number_type]}</Badge>
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
              Release {releasing ? formatE164(releasing.e164) : "this number"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {releasing?.provider === "byo_sip"
                ? "This unregisters the number from your trunk immediately. You can register it again later."
                : "This permanently gives the number up. Callers who dial it won't reach you, and you may not be able to get it back."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!releasing) return;
                const provider = releasing.provider;
                release.mutate(releasing.id, {
                  onSuccess: () =>
                    toast.success(
                      provider === "byo_sip" ? "Number released" : "Releasing number"
                    ),
                  onError: (error) => toast.error(error.message),
                });
                setReleasing(null);
              }}
            >
              Release number
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
