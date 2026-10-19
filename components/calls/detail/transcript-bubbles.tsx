"use client";

import { useTranslations } from "next-intl";
import { WrenchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallTranscript } from "@/hooks/use-calls";
import { TOOL_LABELS } from "@/lib/agents/tool-catalog";
import { formatOffset } from "@/lib/datetime";
import { cn } from "@/lib/utils";

/** Catalog tools use their translated label; anything else: snake_case → "Book appointment". */
function humanizeTool(name: string): string {
  if (Object.prototype.hasOwnProperty.call(TOOL_LABELS, name)) return TOOL_LABELS[name].label;
  const spaced = name.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The conversation as chat bubbles — agent left, caller right, tool-call
 * chips inline. Fetches its own transcript so the transcript tab and the
 * consult leg can both drop it in; enable only once visible.
 *
 * With `onSeek`, timestamps become buttons that jump the recording there;
 * with `activeTime`, the bubble currently playing gets a subtle ring.
 */
export function TranscriptBubbles({
  businessUuid,
  callUuid,
  enabled,
  onSeek,
  activeTime,
}: {
  businessUuid: string;
  callUuid: string;
  enabled: boolean;
  onSeek?: (seconds: number) => void;
  activeTime?: number | null;
}) {
  const t = useTranslations("calls");
  const transcript = useCallTranscript(businessUuid, callUuid, enabled);

  if (transcript.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="ms-auto h-12 w-3/4" />
        <Skeleton className="h-12 w-2/3" />
      </div>
    );
  }

  if (transcript.isError || transcript.data.segments.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {transcript.isError && transcript.error.status !== 404
          ? t("transcript.loadFailed")
          : t("transcript.empty")}
      </p>
    );
  }

  const segments = transcript.data.segments;

  let activeIndex = -1;
  if (activeTime !== null && activeTime !== undefined) {
    segments.forEach((segment, index) => {
      if (segment.t0_secs !== null && segment.t0_secs <= activeTime) activeIndex = index;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {segments.map((segment, index) => {
        const caller = segment.role === "user";
        const t0 = segment.t0_secs;
        return (
          <div
            key={index}
            className={cn("flex max-w-[85%] flex-col gap-1", caller && "self-end")}
          >
            <div
              className={cn(
                "flex items-baseline gap-2 text-xs text-muted-foreground",
                caller && "flex-row-reverse"
              )}
            >
              <span className="font-medium">
                {caller ? t("transcript.caller") : t("labels.agent")}
              </span>
              {t0 !== null &&
                (onSeek ? (
                  <button
                    type="button"
                    onClick={() => onSeek(t0)}
                    className="tabular-nums hover:text-foreground hover:underline"
                    aria-label={t("transcript.playFrom", { time: formatOffset(t0) })}
                  >
                    {formatOffset(t0)}
                  </button>
                ) : (
                  <span className="tabular-nums">{formatOffset(t0)}</span>
                ))}
            </div>
            {segment.text && (
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap",
                  caller
                    ? "rounded-se-sm bg-primary text-primary-foreground"
                    : "rounded-ss-sm bg-muted",
                  index === activeIndex && "ring-2 ring-cta/60"
                )}
              >
                {segment.text}
              </div>
            )}
            {segment.tool_call && segment.tool_call.names.length > 0 && (
              <div className={cn("flex flex-wrap gap-1", caller && "justify-end")}>
                {segment.tool_call.names.map((name) => (
                  <Badge key={name} className="bg-cta/10 text-cta">
                    <WrenchIcon />
                    {humanizeTool(name)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
