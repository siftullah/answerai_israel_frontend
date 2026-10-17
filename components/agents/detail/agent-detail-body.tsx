"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  KeyRoundIcon,
  PhoneIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBusiness } from "@/components/business/business-provider";
import { AgentPurposeBadge, AgentSyncBadge } from "@/components/agents/agent-badges";
import { TestCallSheet } from "@/components/agents/test-call-sheet";
import { AgentJumpNav } from "@/components/agents/detail/agent-jump-nav";
import { UnsavedChangesBar } from "@/components/unsaved-changes-bar";
import { CalendarSection } from "@/components/agents/detail/sections/calendar-section";
import { CallSummarySection } from "@/components/agents/detail/sections/call-summary-section";
import { ConversationSection } from "@/components/agents/detail/sections/conversation-section";
import { DangerSection } from "@/components/agents/detail/sections/danger-section";
import { GeneralSection } from "@/components/agents/detail/sections/general-section";
import { KnowledgeSection } from "@/components/agents/detail/sections/knowledge-section";
import { NumbersSection } from "@/components/agents/detail/sections/numbers-section";
import { ToolsSection } from "@/components/agents/detail/sections/tools-section";
import { TransfersSection } from "@/components/agents/detail/sections/transfers-section";
import { VariablesSection } from "@/components/agents/detail/sections/variables-section";
import { VoiceSection } from "@/components/agents/detail/sections/voice-section";
import {
  useArchiveAgent,
  useDeleteAgent,
  useRestoreAgent,
  useRotateAgentToolToken,
  useUpdateAgent,
} from "@/hooks/use-agents";
import { usePhoneNumbers } from "@/hooks/use-phone-numbers";
import { enabledToolKeys } from "@/lib/agents/tool-catalog";
import type { Agent, AgentConfigWarning } from "@/lib/api/types";
import { TRANSITIONAL_SYNC_STATUSES } from "@/lib/api/types";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import {
  agentServerErrorKey,
  agentSettingsSchema,
  toAgentSettingsValues,
  toUpdateAgentPayload,
  type AgentSettingsValues,
} from "@/lib/validation/agent";
import { formatE164 } from "@/lib/phone";

/** Which section card a field's error lives in — for scroll-on-invalid. */
const FIELD_SECTION: Record<string, string> = {
  name: "general",
  description: "general",
  purpose: "general",
  voice_id: "voice",
  first_message: "conversation",
  prompt_text: "conversation",
  action_tools: "tools",
  dynamic_variables: "variables",
  overridable_builtins: "variables",
  calendar: "calendar",
  rag_enabled: "knowledge",
};

function scrollToFirstError(errors: FieldErrors<AgentSettingsValues>): void {
  const firstField = Object.keys(errors).find((key) => key !== "root");
  const sectionId = firstField ? FIELD_SECTION[firstField] : undefined;
  if (sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/**
 * Everything below the route level: header, banners, the single settings
 * form spanning every section, and the floating save bar. Remounted (via
 * key) per agent so the form initializes exactly once — background sync
 * polling can never clobber in-progress edits.
 */
export function AgentDetailBody({ agent }: { agent: Agent }) {
  const router = useRouter();
  const { business, modules } = useBusiness();
  const archived = agent.status === "archived";
  const listHref = `/b/${business.id}/agents`;

  const updateAgent = useUpdateAgent(business.id, agent.id);
  const archiveAgent = useArchiveAgent(business.id);
  const restoreAgent = useRestoreAgent(business.id);
  const deleteAgent = useDeleteAgent(business.id);
  const rotateToken = useRotateAgentToolToken(agent.id);
  const numbersQuery = usePhoneNumbers(business.id);

  const form = useForm<AgentSettingsValues>({
    resolver: zodResolver(agentSettingsSchema),
    defaultValues: toAgentSettingsValues(agent),
    disabled: archived,
  });

  const [warnings, setWarnings] = useState<AgentConfigWarning[]>([]);
  const [testOpen, setTestOpen] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const { isDirty } = form.formState;
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const allowedTools = useMemo(() => enabledToolKeys(modules), [modules]);

  const onSave = form.handleSubmit(
    (values) => {
      updateAgent.mutate(toUpdateAgentPayload(values, { allowedTools }), {
        onSuccess: (result) => {
          form.reset(toAgentSettingsValues(result.agent));
          setWarnings(result.warnings);
          toast.success("Agent saved — publishing to the voice engine…");
        },
        onError: (error) => {
          applyServerErrors(form, error, { mapKey: agentServerErrorKey });
          const fieldKeys = Object.keys(form.formState.errors).filter((key) => key !== "root");
          if (fieldKeys.length > 0) {
            scrollToFirstError(form.formState.errors);
            toast.error("Fix the highlighted fields.");
          } else {
            toast.error(error.message);
          }
        },
      });
    },
    (errors) => scrollToFirstError(errors)
  );

  const handleArchiveToggle = () => {
    const mutation = archived ? restoreAgent : archiveAgent;
    mutation.mutate(agent.id, {
      onSuccess: () => toast.success(archived ? "Agent restored" : "Agent archived"),
      onError: (error) => toast.error(error.message),
    });
  };

  const routedNumbers = (numbersQuery.data ?? []).filter(
    (number) =>
      number.inbound_agent?.id === agent.id || number.outbound_agent?.id === agent.id
  );

  const testTooltip = archived
    ? "Restore the agent to test it."
    : !agent.has_been_published
      ? "The agent publishes to the voice engine after its first save — testing unlocks once that completes."
      : TRANSITIONAL_SYNC_STATUSES.includes(agent.sync_status)
        ? "A publish is in progress — tests use the last published version."
        : null;
  const testDisabled = archived || !agent.has_been_published;

  const testButton = (
    <Button type="button" variant="cta" disabled={testDisabled} onClick={() => setTestOpen(true)}>
      <PhoneIcon />
      Test agent
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Link
            href={listHref}
            onClick={(event) => {
              if (form.formState.isDirty) {
                event.preventDefault();
                setConfirmLeave(true);
              }
            }}
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Agents
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-2xl font-semibold">{agent.name}</h1>
            <AgentPurposeBadge purpose={agent.purpose} />
            {archived ? (
              <Badge variant="ghost">Archived</Badge>
            ) : (
              <AgentSyncBadge status={agent.sync_status} error={agent.sync_error} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {testTooltip ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>{testButton}</TooltipTrigger>
              <TooltipContent className="max-w-64">{testTooltip}</TooltipContent>
            </Tooltip>
          ) : (
            testButton
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" aria-label="Agent actions" />}
            >
              <EllipsisVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {archived ? (
                <DropdownMenuItem onClick={handleArchiveToggle}>
                  <ArchiveRestoreIcon />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleArchiveToggle}>
                  <ArchiveIcon />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem disabled={archived} onClick={() => setConfirmRotate(true)}>
                <KeyRoundIcon />
                Rotate tool token
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!archived && agent.sync_status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Publish failed</AlertTitle>
          <AlertDescription>
            {agent.sync_error ?? "The voice engine rejected the last publish."} We retry
            automatically every 15 minutes — your changes are safe and go live on the next
            successful sync.
          </AlertDescription>
        </Alert>
      )}

      {archived && (
        <Alert>
          <AlertTitle>This agent is archived and read-only.</AlertTitle>
          <AlertDescription>Restore it to make changes or take calls.</AlertDescription>
          <AlertAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={restoreAgent.isPending}
              onClick={handleArchiveToggle}
            >
              Restore
            </Button>
          </AlertAction>
        </Alert>
      )}

      <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-8">
        <AgentJumpNav />
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <FormProvider {...form}>
            <GeneralSection />
            <VoiceSection />
            <ConversationSection
              warnings={warnings}
              onDismissWarnings={() => setWarnings([])}
            />
            <ToolsSection />
            <VariablesSection />
            <CalendarSection />
            <TransfersSection agent={agent} />
            <KnowledgeSection agent={agent} />
            <NumbersSection agent={agent} />
            <CallSummarySection agent={agent} />
            <DangerSection
              agent={agent}
              onRotateToken={() => setConfirmRotate(true)}
              onArchiveToggle={handleArchiveToggle}
              archivePending={archiveAgent.isPending || restoreAgent.isPending}
              onDelete={() => setConfirmDelete(true)}
            />
            <UnsavedChangesBar
              onSave={() => void onSave()}
              onDiscard={() => form.reset()}
              saving={updateAgent.isPending}
            />
          </FormProvider>
        </div>
      </div>

      <TestCallSheet agent={agent} open={testOpen} onOpenChange={setTestOpen} />

      <AlertDialog open={confirmRotate} onOpenChange={setConfirmRotate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate the tool token?</AlertDialogTitle>
            <AlertDialogDescription>
              The old token stops working immediately. The voice engine receives the new one
              automatically on the next sync — live calls in progress may lose tool access
              until then.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-cta text-cta-foreground hover:bg-cta/90"
              onClick={() => {
                rotateToken.mutate(undefined, {
                  onSuccess: (result) => toast.success(result.message),
                  onError: (error) => toast.error(error.message),
                });
                setConfirmRotate(false);
              }}
            >
              Rotate token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {agent.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the agent and unpublishes it from the voice engine.
              {routedNumbers.length > 0 && (
                <>
                  {" "}
                  {routedNumbers.length}{" "}
                  {routedNumbers.length === 1 ? "phone number" : "phone numbers"} currently
                  route to this agent and will be left unassigned:{" "}
                  {routedNumbers.map((number) => formatE164(number.e164)).join(", ")}.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteAgent.mutate(agent.id, {
                  onSuccess: () => {
                    toast.success("Agent deleted");
                    router.push(listHref);
                  },
                  onError: (error) => toast.error(error.message),
                });
                setConfirmDelete(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your edits haven&apos;t been saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmLeave(false);
                router.push(listHref);
              }}
            >
              Discard and leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
