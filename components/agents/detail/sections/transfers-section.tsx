"use client";

import { useState } from "react";
import Link from "next/link";
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
        "Team member")
      : null;

  const destination = (target: TransferTarget) => {
    const name = memberName(target);
    if (target.to_e164 && name) return `${formatE164(target.to_e164)} (overrides ${name})`;
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
      toast.success(
        `Copied ${businessTargets.length} ${businessTargets.length === 1 ? "target" : "targets"} — this agent now uses its own directory.`
      );
    } catch (error) {
      // Already-copied entries remain: the section lands in the customised
      // state where the rest can be added manually.
      toast.error(error instanceof Error ? error.message : "Couldn't copy every target.");
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
      toast.success("Reverted — this agent uses the business directory again.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove every target.");
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
      title="Transfers"
      description="Who this agent can hand live calls to."
      actions={
        customised && !archived ? (
          <Button type="button" variant="cta" size="sm" onClick={() => setEditor({ target: null })}>
            <PlusIcon />
            Add target
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
          title="Couldn't load transfer targets"
          message={ownQuery.error.message}
          onRetry={() => ownQuery.refetch()}
        />
      ) : !customised ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-muted/40 p-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Using the business directory</p>
              <Badge variant="secondary">
                {businessMode === "screened" ? "Screened" : "Blind"}
              </Badge>
            </div>
            {businessTargets.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No business-wide targets yet — this agent currently has nowhere to transfer
                calls.
              </p>
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
                    …and {businessTargets.length - 5} more
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
                  ? `Copying ${copying.done} of ${copying.total}…`
                  : "Customise for this agent"}
              </Button>
            )}
            <Button
              variant="cta"
              size="sm"
              render={<Link href={`/b/${business.id}/business-profile/transfers`} />}
            >
              Edit business directory
              <ArrowUpRightIcon />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            This agent uses its own directory and ignores the business-wide one.
          </p>

          <ChoiceCards
            value={scopeMode}
            onChange={(value) => {
              if (!archived) requestMode(value);
            }}
            className="max-w-xl"
            options={[
              {
                value: "blind",
                label: "Blind",
                description: "Connect the caller straight through.",
              },
              {
                value: "screened",
                label: "Screened",
                description: "The AI briefs the person first, then connects the caller.",
              },
            ]}
          />

          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Hours</TableHead>
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
                                aria-label={`Actions for ${target.name}`}
                              />
                            }
                          >
                            <EllipsisVerticalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditor({ target })}>
                              <PencilIcon />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleting(target)}
                            >
                              <Trash2Icon />
                              Delete
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
                Revert to business directory
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={customising} onOpenChange={setCustomising}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customise transfers for this agent</DialogTitle>
            <DialogDescription>
              Once this agent has its own targets, it stops using the business directory
              entirely.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyBusinessDirectory()}
            >
              Copy the business directory ({businessTargets.length}{" "}
              {businessTargets.length === 1 ? "target" : "targets"})
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCustomising(false);
                setEditor({ target: null });
              }}
            >
              Start empty
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
              Switch every target to {pendingMode === "screened" ? "screened" : "blind"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This changes how all {own.length} {own.length === 1 ? "target" : "targets"} in
              this agent&apos;s directory transfer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
              Switch mode
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
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {own.length === 1
                ? "This is the agent's last custom target — deleting it puts the agent back on the business directory."
                : "This agent will no longer transfer calls here."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteTarget.mutate(deleting.id, {
                  onSuccess: () => toast.success("Transfer target deleted"),
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

      <AlertDialog open={reverting} onOpenChange={setReverting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to the business directory?</AlertDialogTitle>
            <AlertDialogDescription>
              Deletes all {own.length} custom {own.length === 1 ? "target" : "targets"}. Calls
              will use the business-wide directory again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void revertToBusiness()}>
              Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AgentSection>
  );
}
