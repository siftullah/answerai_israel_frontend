"use client";

import { useTranslations } from "next-intl";
import { LiveDuration } from "@/components/calls/live-duration";
import type { Call, CallStatus } from "@/lib/api/types";

/** The in-flight strip (outbound only — inbound calls arrive post-call). */
export function LiveCallBanner({ call }: { call: Call }) {
  const t = useTranslations("calls.live");
  const liveLabels: Partial<Record<CallStatus, string>> = {
    queued: t("queued"),
    initiating: t("initiating"),
    ringing: t("ringing"),
    in_progress: t("inProgress"),
  };
  const label = liveLabels[call.status];
  if (!label) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-primary/5 px-4 py-3 ring-1 ring-primary/15">
      <span className="size-2 shrink-0 animate-pulse rounded-full bg-primary" aria-hidden />
      <p className="text-sm font-medium">{label}</p>
      {call.status === "in_progress" && call.started_at && (
        <LiveDuration
          startedAt={call.started_at}
          className="ms-auto text-sm tabular-nums text-muted-foreground"
        />
      )}
    </div>
  );
}
