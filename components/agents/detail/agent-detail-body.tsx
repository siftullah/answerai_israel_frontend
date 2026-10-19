"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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

  const t = useTranslations("agents");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const schema = useMemo(() => agentSettingsSchema(tv), [tv]);
  const form = useForm<AgentSettingsValues>({
    resolver: zodResolver(schema),
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
          toast.success(t("detail.toasts.saved"));
        },
        onError: (error) => {
          applyServerErrors(form, error, { mapKey: agentServerErrorKey });
          const fieldKeys = Object.keys(form.formState.errors).filter((key) => key !== "root");
          if (fieldKeys.length > 0) {
            scrollToFirstError(form.formState.errors);
            toast.error(t("detail.toasts.fixFields"));
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
      onSuccess: () => toast.success(archived ? t("toasts.restored") : t("toasts.archived")),
      onError: (error) => toast.error(error.message),
    });
  };

  const routedNumbers = (numbersQuery.data ?? []).filter(
    (number) =>
      number.inbound_agent?.id === agent.id || number.outbound_agent?.id === agent.id
  );

  const testTooltip = archived
    ? t("detail.testTooltip.archived")
    : !agent.has_been_published
      ? t("detail.testTooltip.unpublished")
      : TRANSITIONAL_SYNC_STATUSES.includes(agent.sync_status)
        ? t("detail.testTooltip.publishing")
        : null;
  const testDisabled = archived || !agent.has_been_published;

  const testButton = (
    <Button type="button" variant="cta" disabled={testDisabled} onClick={() => setTestOpen(true)}>
      <PhoneIcon />
      {t("detail.testAgent")}
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
            <ArrowLeftIcon className="size-4 rtl:-scale-x-100" />
            {t("detail.back")}
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-2xl font-semibold">{agent.name}</h1>
            <AgentPurposeBadge purpose={agent.purpose} />
            {archived ? (
              <Badge variant="ghost">{t("badges.archived")}</Badge>
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
              render={
                <Button variant="ghost" size="icon" aria-label={t("detail.actionsLabel")} />
              }
            >
              <EllipsisVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {archived ? (
                <DropdownMenuItem onClick={handleArchiveToggle}>
                  <ArchiveRestoreIcon />
                  {t("actions.restore")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleArchiveToggle}>
                  <ArchiveIcon />
                  {t("actions.archive")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem disabled={archived} onClick={() => setConfirmRotate(true)}>
                <KeyRoundIcon />
                {t("actions.rotateToolToken")}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2Icon />
                {tc("actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!archived && agent.sync_status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>{t("detail.publishFailed.title")}</AlertTitle>
          <AlertDescription>
            {t("detail.publishFailed.description", {
              error: agent.sync_error ?? t("detail.publishFailed.fallback"),
            })}
          </AlertDescription>
        </Alert>
      )}

      {archived && (
        <Alert>
          <AlertTitle>{t("detail.archivedBanner.title")}</AlertTitle>
          <AlertDescription>{t("detail.archivedBanner.description")}</AlertDescription>
          <AlertAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={restoreAgent.isPending}
              onClick={handleArchiveToggle}
            >
              {t("actions.restore")}
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
            <AlertDialogTitle>{t("detail.rotateDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("detail.rotateDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
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
              {t("actions.rotateToken")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title", { name: agent.name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description")}
              {routedNumbers.length > 0 && (
                <>
                  {" "}
                  {t("deleteDialog.routedNumbers", {
                    count: routedNumbers.length,
                    numbers: routedNumbers.map((number) => formatE164(number.e164)).join(", "),
                  })}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteAgent.mutate(agent.id, {
                  onSuccess: () => {
                    toast.success(t("toasts.deleted"));
                    router.push(listHref);
                  },
                  onError: (error) => toast.error(error.message),
                });
                setConfirmDelete(false);
              }}
            >
              {tc("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("detail.leaveDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("detail.leaveDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("actions.keepEditing")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmLeave(false);
                router.push(listHref);
              }}
            >
              {t("detail.leaveDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
