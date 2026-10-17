"use client";

import { useState } from "react";
import { MessageSquareTextIcon, MilestoneIcon, PhoneIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DetailCard } from "@/components/calls/detail/detail-card";
import { ErrorState } from "@/components/error-state";
import { useAddLeadNote, useLeadActivities } from "@/hooks/use-leads";
import { formatDateTime } from "@/lib/datetime";
import type { LeadActivity, LeadActivityType } from "@/lib/api/types";

const TYPE_ICONS: Record<LeadActivityType, React.ComponentType<{ className?: string }>> = {
  note: MessageSquareTextIcon,
  status_change: MilestoneIcon,
  call: PhoneIcon,
};

function ActivityItem({ activity, timeZone }: { activity: LeadActivity; timeZone: string }) {
  const Icon = TYPE_ICONS[activity.type];

  return (
    <li className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
        {activity.body && (
          <p className="text-sm whitespace-pre-wrap break-words">{activity.body}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {/* Null user = the AI agent or the post-call pipeline wrote it. */}
          {activity.user?.name ?? "AnswerAI"} · {formatDateTime(activity.created_at, timeZone)}
        </p>
      </div>
    </li>
  );
}

/**
 * The lead's history, newest first: notes from the team, journaled status
 * changes, and calls with the contact while the lead was open — plus the
 * composer for adding the next note.
 */
export function LeadActivityTimeline({
  businessUuid,
  leadUuid,
  timeZone,
}: {
  businessUuid: string;
  leadUuid: string;
  timeZone: string;
}) {
  const activitiesQuery = useLeadActivities(businessUuid, leadUuid);
  const addNote = useAddLeadNote(businessUuid);
  const [note, setNote] = useState("");

  const submit = () => {
    const trimmed = note.trim();
    if (trimmed === "") return;

    addNote.mutate(
      { id: leadUuid, note: trimmed },
      {
        onSuccess: () => setNote(""),
        onError: (error) => toast.error(error.message),
      }
    );
  };

  return (
    <DetailCard title="Activity" accent>
      <div className="flex flex-col gap-2">
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={5000}
          placeholder="Add a note — calls made, follow-ups, pricing…"
          aria-label="Add a note to this lead"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={submit}
            disabled={note.trim() === "" || addNote.isPending}
          >
            {addNote.isPending ? "Adding…" : "Add note"}
          </Button>
        </div>
      </div>

      {activitiesQuery.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
        </div>
      ) : activitiesQuery.isError ? (
        <ErrorState
          title="Couldn't load the timeline"
          message={activitiesQuery.error.message}
          onRetry={() => activitiesQuery.refetch()}
        />
      ) : activitiesQuery.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing yet — notes and status changes will show up here.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {activitiesQuery.data.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} timeZone={timeZone} />
          ))}
        </ul>
      )}
    </DetailCard>
  );
}
