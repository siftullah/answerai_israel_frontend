"use client";

import Link from "next/link";
import { ArrowUpRightIcon, PhoneOffIcon, UserRoundIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CallStatusBadge } from "@/components/calls/call-status-badge";
import { counterpartName, counterpartNumber } from "@/components/calls/call-identity";
import { formatE164 } from "@/lib/phone";
import type { Call } from "@/lib/api/types";

/**
 * Identity + status header, in the agent-detail header idiom: title with
 * inline badges, actions right. When the caller is unknown the title IS the
 * number — the sub-line then drops it rather than echoing it.
 */
export function CallDetailHeader({
  call,
  businessUuid,
  onCancel,
}: {
  call: Call;
  businessUuid: string;
  /** Present ⇒ the call is still cancelable. */
  onCancel?: () => void;
}) {
  const name = counterpartName(call);
  const number = formatE164(counterpartNumber(call));
  const showNumber = name !== number;

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="max-w-full truncate font-heading text-2xl font-semibold">{name}</h2>
          <CallStatusBadge status={call.status} />
          {call.campaign && (
            <Badge
              variant="outline"
              render={<Link href={`/b/${businessUuid}/calls/campaigns/${call.campaign.id}`} />}
            >
              Campaign: {call.campaign.name}
              <ArrowUpRightIcon />
            </Badge>
          )}
          {call.callback && (
            <Badge
              variant="outline"
              render={
                <Link href={`/b/${businessUuid}/calls/callbacks?callback=${call.callback.id}`} />
              }
            >
              Callback
              <ArrowUpRightIcon />
            </Badge>
          )}
        </div>
        {(showNumber || call.caller_email) && (
          <p className="truncate text-sm text-foreground/70">
            {showNumber && <span className="tabular-nums">{number}</span>}
            {showNumber && call.caller_email && " · "}
            {call.caller_email}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {call.contact && !call.contact.deleted && (
          <Button
            variant="cta"
            size="sm"
            render={<Link href={`/b/${businessUuid}/contacts/${call.contact.id}`} />}
          >
            <UserRoundIcon />
            View contact
          </Button>
        )}
        {onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            <PhoneOffIcon />
            Cancel call
          </Button>
        )}
      </div>
    </div>
  );
}
