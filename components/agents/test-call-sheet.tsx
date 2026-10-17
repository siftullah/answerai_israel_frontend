"use client";

import { useState } from "react";
import { ChevronDownIcon, WrenchIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAgentTestCall } from "@/hooks/use-agents";
import { isApiError } from "@/lib/api/errors";
import type { Agent, AgentTestCallTurn } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface TestRun {
  id: number;
  message: string;
  status: "running" | "done" | "error";
  transcript?: AgentTestCallTurn[];
  error?: string;
  errorKind?: "unpublished" | "engine" | "other";
}

function TurnBubble({ turn }: { turn: AgentTestCallTurn }) {
  const isCaller = turn.role === "user";
  return (
    <div className={cn("flex flex-col gap-1", isCaller ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
          isCaller ? "bg-primary/10" : "bg-muted"
        )}
      >
        {turn.message === "" ? (
          <span className="text-muted-foreground italic">(silence)</span>
        ) : (
          turn.message
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-1">
        {turn.time_in_call_secs !== null && (
          <span className="text-[11px] text-muted-foreground">
            {Math.round(turn.time_in_call_secs)}s
          </span>
        )}
        {turn.tool_calls.map((tool, index) => (
          <Badge key={index} variant="outline" className="gap-1 text-[11px]">
            <WrenchIcon className="size-2.5" />
            {tool}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function RunBlock({ run }: { run: TestRun }) {
  return (
    <Collapsible defaultOpen className="rounded-2xl border">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 p-3 text-left">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          &ldquo;{run.message}&rdquo;
        </span>
        {run.status === "running" && <Spinner className="size-4 shrink-0" />}
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-3 border-t p-3">
          {run.status === "running" && (
            <p className="text-sm text-muted-foreground">
              Simulating the conversation — this can take up to a minute…
            </p>
          )}
          {run.status === "error" &&
            (run.errorKind === "unpublished" ? (
              <Alert variant="warning">
                <AlertDescription>
                  {run.error} New agents publish automatically within a minute of their first
                  save.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertDescription>{run.error}</AlertDescription>
              </Alert>
            ))}
          {run.status === "done" &&
            (run.transcript && run.transcript.length > 0 ? (
              run.transcript.map((turn, index) => <TurnBubble key={index} turn={turn} />)
            ) : (
              <p className="text-sm text-muted-foreground">
                The simulation returned no transcript.
              </p>
            ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Simulated test calls: one opening line from the caller — the engine plays
 * out the full conversation with the agent's tools mocked. Mounted
 * permanently so run history survives closing the sheet.
 */
export function TestCallSheet({
  agent,
  open,
  onOpenChange,
}: {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const testCall = useAgentTestCall(agent.id);
  const [message, setMessage] = useState("");
  const [runs, setRuns] = useState<TestRun[]>([]);

  const runTest = () => {
    const trimmed = message.trim();
    if (trimmed === "" || testCall.isPending) return;
    const id = Date.now();
    setRuns((current) => [{ id, message: trimmed, status: "running" }, ...current]);
    setMessage("");
    testCall.mutate(
      { message: trimmed },
      {
        onSuccess: (result) =>
          setRuns((current) =>
            current.map((run) =>
              run.id === id ? { ...run, status: "done", transcript: result.transcript } : run
            )
          ),
        onError: (error) => {
          const kind = isApiError(error)
            ? error.status === 422
              ? "unpublished"
              : error.status === 502
                ? "engine"
                : "other"
            : "other";
          setRuns((current) =>
            current.map((run) =>
              run.id === id
                ? { ...run, status: "error", error: error.message, errorKind: kind }
                : run
            )
          );
        },
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Test {agent.name}</SheetTitle>
          <SheetDescription>
            Type the caller&apos;s opening line — the voice engine simulates the whole
            conversation against the last published version, with tools mocked.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No test runs yet. Try &ldquo;Hi, what are your opening hours?&rdquo;
            </p>
          ) : (
            runs.map((run) => <RunBlock key={run.id} run={run} />)
          )}
        </div>

        <div className="flex flex-col gap-2 border-t p-4">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="What does the caller say first?"
            aria-label="Caller's opening line"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                runTest();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{message.length} / 2,000</span>
            <Button
              type="button"
              size="sm"
              disabled={message.trim() === "" || testCall.isPending}
              onClick={runTest}
            >
              {testCall.isPending && <Spinner />}
              Run test
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
