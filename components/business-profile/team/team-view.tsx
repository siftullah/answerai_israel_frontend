"use client";

import { useState } from "react";
import {
  CalendarCheckIcon,
  EllipsisVerticalIcon,
  MailPlusIcon,
  MailXIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
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
import { Field, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { useBusiness, useModuleEnabled } from "@/components/business/business-provider";
import { DataTableShell } from "@/components/business-profile/data-table-shell";
import { InviteDialog } from "@/components/business-profile/team/invite-dialog";
import { MemberDialog } from "@/components/business-profile/team/member-dialog";
import { ViewModeToggle } from "@/components/business-profile/view-mode-toggle";
import { useViewMode } from "@/hooks/use-view-mode";
import {
  useInvitations,
  useResendInvitation,
  useRevokeInvitation,
} from "@/hooks/use-invitations";
import { useDeleteMember, useMembers } from "@/hooks/use-members";
import { formatDate } from "@/lib/datetime";
import { formatE164 } from "@/lib/phone";
import type { BusinessMember, Invitation } from "@/lib/api/types";

function MemberRowActions({
  member,
  invitation,
  isOwner,
  onEdit,
  onInvite,
  onResendInvite,
  onRevokeInvite,
  onRemove,
}: {
  member: BusinessMember;
  invitation: Invitation | null;
  isOwner: boolean;
  onEdit: () => void;
  onInvite: () => void;
  onResendInvite: () => void;
  onRevokeInvite: () => void;
  onRemove: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.name}`} />
        }
      >
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon />
          Edit
        </DropdownMenuItem>
        {invitation ? (
          <>
            <DropdownMenuItem onClick={onResendInvite}>
              <SendIcon />
              Resend invite
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onRevokeInvite}>
              <MailXIcon />
              Revoke invite
            </DropdownMenuItem>
          </>
        ) : (
          !member.has_account &&
          member.email && (
            <DropdownMenuItem onClick={onInvite}>
              <MailPlusIcon />
              Invite to create account
            </DropdownMenuItem>
          )
        )}
        {!isOwner && (
          <DropdownMenuItem variant="destructive" onClick={onRemove}>
            <Trash2Icon />
            Remove
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Account state at a glance; a pending invite shows its expiry on hover. */
function MemberStatusBadge({
  member,
  invitation,
}: {
  member: BusinessMember;
  invitation: Invitation | null;
}) {
  const { business } = useBusiness();
  if (member.has_account) return <Badge variant="success">Account exists</Badge>;
  if (invitation) {
    return (
      <Badge
        variant="info"
        title={`Invite expires ${formatDate(invitation.expires_at, business.timezone)}`}
      >
        Invited
      </Badge>
    );
  }
  return <Badge variant="warning">No account</Badge>;
}

/** The Status column/card content: state badge plus a calendar chip when connected. */
function MemberAccountStatus({
  member,
  invitation,
}: {
  member: BusinessMember;
  invitation: Invitation | null;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <MemberStatusBadge member={member} invitation={invitation} />
      {member.has_account && member.has_calendar_connected && (
        <span
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
          title="Calendar connected"
        >
          <CalendarCheckIcon className="size-4" />
          Calendar
        </span>
      )}
    </span>
  );
}

export function TeamView() {
  const { business } = useBusiness();
  const appointmentsEnabled = useModuleEnabled("appointments");

  const membersQuery = useMembers(business.id);
  const invitationsQuery = useInvitations(business.id);
  const deleteMember = useDeleteMember(business.id);
  const revokeInvitation = useRevokeInvitation(business.id);
  const resendInvitation = useResendInvitation(business.id);

  // Pending invitations fold into the member rows (invites are created from
  // member rows, so the emails match exactly).
  const invitationByEmail = new Map(
    (invitationsQuery.data ?? [])
      .filter((invitation) => invitation.email !== null)
      .map((invitation) => [invitation.email!.toLowerCase(), invitation])
  );

  const pendingInvitationFor = (member: BusinessMember): Invitation | null =>
    !member.has_account && member.email
      ? (invitationByEmail.get(member.email.toLowerCase()) ?? null)
      : null;

  const resendInvite = (invitation: Invitation) => {
    resendInvitation.mutate(invitation.id, {
      onSuccess: () => toast.success("Invitation re-sent"),
      onError: (error) => toast.error(error.message),
    });
  };

  const [viewMode, setViewMode] = useViewMode("team");
  const [memberDialog, setMemberDialog] = useState<{ member: BusinessMember | null } | null>(
    null
  );
  const [inviteDialog, setInviteDialog] = useState<{ member: BusinessMember } | null>(null);
  const [removing, setRemoving] = useState<BusinessMember | null>(null);
  const [futureAppointments, setFutureAppointments] = useState<"keep" | "unassign">("keep");
  const [revoking, setRevoking] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team"
        description="People in your business, their roles and invitations."
        actions={
          <Button onClick={() => setMemberDialog({ member: null })}>
            <PlusIcon />
            Add member
          </Button>
        }
      />

      {membersQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : membersQuery.isError ? (
        <ErrorState
          title="Couldn't load the team"
          message={membersQuery.error.message}
          onRetry={() => membersQuery.refetch()}
        />
      ) : (
        <>
          <div className="flex justify-end">
            <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          </div>
          {viewMode === "cards" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {membersQuery.data.map((member) => {
                const isOwner = member.role?.slug === "owner";
                const invitation = pendingInvitationFor(member);
                return (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{member.name}</p>
                        {member.position && (
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {member.position}
                          </p>
                        )}
                      </div>
                      <MemberRowActions
                        member={member}
                        invitation={invitation}
                        isOwner={isOwner}
                        onEdit={() => setMemberDialog({ member })}
                        onInvite={() => setInviteDialog({ member })}
                        onResendInvite={() => invitation && resendInvite(invitation)}
                        onRevokeInvite={() => invitation && setRevoking(invitation.id)}
                        onRemove={() => {
                          setFutureAppointments("keep");
                          setRemoving(member);
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                      <span className="truncate">{member.email ?? "—"}</span>
                      {member.phone_e164 && (
                        <span className="truncate">{formatE164(member.phone_e164)}</span>
                      )}
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
                      <span className="text-muted-foreground">
                        {member.role?.name ?? "—"}
                      </span>
                      <MemberAccountStatus member={member} invitation={invitation} />
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
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersQuery.data.map((member) => {
                const isOwner = member.role?.slug === "owner";
                const invitation = pendingInvitationFor(member);
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex max-w-56 flex-col">
                        <span className="truncate font-medium">{member.name}</span>
                        {member.position && (
                          <span className="truncate text-sm text-muted-foreground">
                            {member.position}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-64 flex-col">
                        <span className="truncate text-sm">{member.email ?? "—"}</span>
                        {member.phone_e164 && (
                          <span className="truncate text-sm text-muted-foreground">
                            {formatE164(member.phone_e164)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.role?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <MemberAccountStatus member={member} invitation={invitation} />
                    </TableCell>
                    <TableCell>
                      <MemberRowActions
                        member={member}
                        invitation={invitation}
                        isOwner={isOwner}
                        onEdit={() => setMemberDialog({ member })}
                        onInvite={() => setInviteDialog({ member })}
                        onResendInvite={() => invitation && resendInvite(invitation)}
                        onRevokeInvite={() => invitation && setRevoking(invitation.id)}
                        onRemove={() => {
                          setFutureAppointments("keep");
                          setRemoving(member);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
          )}
        </>
      )}

      {memberDialog && (
        <MemberDialog
          open
          onOpenChange={(next) => {
            if (!next) setMemberDialog(null);
          }}
          member={memberDialog.member}
        />
      )}

      {inviteDialog && (
        <InviteDialog
          open
          onOpenChange={(next) => {
            if (!next) setInviteDialog(null);
          }}
          member={inviteDialog.member}
        />
      )}

      <AlertDialog
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They lose access to this business. Transfer targets pointing at them stop
              working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {appointmentsEnabled && (
            <RadioGroup
              value={futureAppointments}
              onValueChange={(value) =>
                setFutureAppointments(value as "keep" | "unassign")
              }
              className="gap-2"
            >
              <Field orientation="horizontal">
                <RadioGroupItem id="remove-keep" value="keep" />
                <FieldLabel htmlFor="remove-keep" className="font-normal">
                  Keep their future appointments assigned
                </FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <RadioGroupItem id="remove-unassign" value="unassign" />
                <FieldLabel htmlFor="remove-unassign" className="font-normal">
                  Unassign their future appointments
                </FieldLabel>
              </Field>
            </RadioGroup>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!removing) return;
                deleteMember.mutate(
                  { id: removing.id, futureAppointments },
                  {
                    onSuccess: () => toast.success("Member removed"),
                    onError: (error) => toast.error(error.message),
                  }
                );
                setRemoving(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={revoking !== null}
        onOpenChange={(next) => {
          if (!next) setRevoking(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this invitation?</AlertDialogTitle>
            <AlertDialogDescription>The link stops working immediately.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!revoking) return;
                revokeInvitation.mutate(revoking, {
                  onSuccess: () => toast.success("Invitation revoked"),
                  onError: (error) => toast.error(error.message),
                });
                setRevoking(null);
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
