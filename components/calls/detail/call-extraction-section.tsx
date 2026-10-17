"use client";

import { CheckIcon, MinusIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DetailCard } from "@/components/calls/detail/detail-card";
import { useCallExtraction } from "@/hooks/use-calls";

function humanizeKey(key: string): string {
  const spaced = key.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** ElevenLabs entries carry `{ value/result, rationale, ... }` objects. */
function entryRationale(raw: unknown): string | null {
  if (raw !== null && typeof raw === "object" && "rationale" in raw) {
    const rationale = (raw as { rationale: unknown }).rationale;
    if (typeof rationale === "string" && rationale.trim() !== "") return rationale;
  }
  return null;
}

/**
 * ElevenLabs data-collection entries are `{ value, rationale, ... }` objects;
 * anything else (plain strings, arrays, numbers) renders generically.
 */
function displayValue(raw: unknown): string {
  const value =
    raw !== null && typeof raw === "object" && "value" in raw
      ? (raw as { value: unknown }).value
      : raw;

  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map((entry) => displayValue(entry)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Evaluation entries are `{ result: success|failure|unknown, rationale }`. */
function evaluationResult(raw: unknown): string {
  if (raw !== null && typeof raw === "object" && "result" in raw) {
    return String((raw as { result: unknown }).result);
  }
  return displayValue(raw);
}

/** Wraps children in a rationale tooltip when the entry explains itself. */
function WithRationale({
  rationale,
  children,
}: {
  rationale: string | null;
  children: React.ReactNode;
}) {
  if (!rationale) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex max-w-full" />}>
        {children}
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{rationale}</TooltipContent>
    </Tooltip>
  );
}

export function CallExtractionSection({
  businessUuid,
  callUuid,
  enabled,
}: {
  businessUuid: string;
  callUuid: string;
  enabled: boolean;
}) {
  const extraction = useCallExtraction(businessUuid, callUuid, enabled);

  // No extraction configured/produced is the common case — stay quiet.
  if (!enabled || extraction.isError) return null;

  const entries = Object.entries(extraction.data?.data ?? {});
  const evaluations = Object.entries(extraction.data?.evaluation ?? {});

  if (extraction.data && entries.length === 0 && evaluations.length === 0) return null;

  return (
    <DetailCard
      title="Extracted details"
      description="What the agent captured and how it scored against its goals."
    >
      {extraction.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      ) : (
        <>
          {entries.length > 0 && (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              {entries.map(([key, value]) => (
                <div key={key} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">{humanizeKey(key)}</dt>
                  <WithRationale rationale={entryRationale(value)}>
                    <dd className="text-sm break-words">{displayValue(value)}</dd>
                  </WithRationale>
                </div>
              ))}
            </dl>
          )}
          {evaluations.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Evaluation</p>
              <div className="flex flex-wrap gap-1.5">
                {evaluations.map(([key, value]) => {
                  const result = evaluationResult(value);
                  return (
                    <WithRationale key={key} rationale={entryRationale(value)}>
                      <Badge
                        variant={
                          result === "success"
                            ? "success"
                            : result === "failure"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {result === "success" ? (
                          <CheckIcon />
                        ) : result === "failure" ? (
                          <XIcon />
                        ) : (
                          <MinusIcon />
                        )}
                        {humanizeKey(key)}
                      </Badge>
                    </WithRationale>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </DetailCard>
  );
}
