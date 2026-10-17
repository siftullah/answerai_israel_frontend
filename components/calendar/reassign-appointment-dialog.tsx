"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBusiness } from "@/components/business/business-provider";
import { useReassignAppointment } from "@/hooks/use-appointments";
import { useMembers } from "@/hooks/use-members";

/**
 * Hands the booking to another member (or the unassigned pool), keeping its
 * time; the synced calendar copy moves between the members' calendars.
 */
export function ReassignAppointmentDialog({
  open,
  onOpenChange,
  appointmentUuid,
  memberId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentUuid: string;
  /** Current assignee user uuid ("" = unassigned). */
  memberId: string;
}) {
  const { business } = useBusiness();
  const membersQuery = useMembers(business.id);
  const reassign = useReassignAppointment(business.id);
  const [selected, setSelected] = useState(memberId);

  const assignees = (membersQuery.data ?? []).filter(
    (member) => member.has_account && member.user
  );
  const items = [
    { value: "", label: "Unassigned (shared pool)" },
    ...assignees.map((member) => ({ value: member.user?.id ?? "", label: member.name })),
  ];

  const confirm = () => {
    reassign.mutate(
      { id: appointmentUuid, member_id: selected === "" ? null : selected },
      {
        onSuccess: () => {
          toast.success("Appointment reassigned");
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign appointment</DialogTitle>
          <DialogDescription>
            The booking keeps its time — the synced calendar copy moves to the new
            assignee.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="reassign-appointment-member">Assign to</FieldLabel>
          <Select
            items={items}
            value={selected}
            onValueChange={(value) => setSelected((value as string | null) ?? "")}
          >
            <SelectTrigger id="reassign-appointment-member" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={confirm}
            disabled={reassign.isPending || selected === memberId}
          >
            {reassign.isPending ? "Reassigning…" : "Reassign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
