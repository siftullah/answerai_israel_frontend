"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusiness } from "@/components/business/business-provider";
import { CallDirectionIcon, CallStatusBadge } from "@/components/calls/call-status-badge";
import { useCallsInfinite } from "@/hooks/use-calls";
import { formatDayHeading, formatDuration, formatTimeOfDay } from "@/lib/datetime";
import { rt } from "@/lib/i18n/runtime";
import { formatE164 } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { Call, CallListFilters } from "@/lib/api/types";

const RECENT_FILTERS: CallListFilters = { sort: "newest" };
const VISIBLE = 6;

function callerLabel(call: Call): string {
  if (call.contact) return call.contact.name;
  if (call.caller_name) return call.caller_name;
  return formatE164(call.direction === "inbound" ? call.from_e164 : call.to_e164);
}

/** Latest activity across both directions; each row deep-links to the call. */
export function RecentCallsCard({ className }: { className?: string }) {
  const t = useTranslations("dashboard.recentCalls");
  const tc = useTranslations("common");
  const { business } = useBusiness();
  const query = useCallsInfinite(business.id, RECENT_FILTERS);

  const calls = query.data?.pages[0]?.data.slice(0, VISIBLE);
  // formatDayHeading returns this exact (translated) string for today's calls.
  const todayHeading = rt("lib.datetime.today");

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        <CardAction>
          <Link
            href={`/b/${business.id}/calls/inbound-logs`}
            className="text-[13px] font-medium text-cta hover:underline"
          >
            {tc("actions.viewAll")}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-[52px] w-full rounded-lg" />
            ))}
          </div>
        ) : query.isError || !calls || calls.length === 0 ? (
          <Empty className="border border-dashed py-10">
            <EmptyHeader>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="-mx-2 flex flex-col">
            {calls.map((call) => {
              const heading = formatDayHeading(call.created_at, business.timezone);
              const timeLabel =
                heading === todayHeading
                  ? formatTimeOfDay(call.created_at, business.timezone)
                  : heading;

              return (
                <Link
                  key={call.id}
                  href={`/b/${business.id}/calls/${call.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full",
                      call.direction === "inbound"
                        ? "bg-info/10 dark:bg-info/20"
                        : "bg-cta/10 dark:bg-cta/20"
                    )}
                  >
                    <CallDirectionIcon
                      direction={call.direction}
                      className={call.direction === "inbound" ? "text-info" : "text-cta"}
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-medium text-cta">
                      {callerLabel(call)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {call.summary_title ?? t("noSummary")}
                    </span>
                  </span>
                  <span className="hidden shrink-0 sm:block">
                    <CallStatusBadge status={call.status} />
                  </span>
                  <span className="flex w-16 shrink-0 flex-col items-end">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {timeLabel}
                    </span>
                    {call.duration_seconds !== null && (
                      <span className="text-xs text-muted-foreground/70 tabular-nums">
                        {formatDuration(call.duration_seconds)}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
