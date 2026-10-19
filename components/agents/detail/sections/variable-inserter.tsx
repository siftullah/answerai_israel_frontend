"use client";

import { useTranslations } from "next-intl";
import { useFormContext, useWatch } from "react-hook-form";
import { BUILTIN_VARIABLES } from "@/lib/validation/agent";
import type { AgentSettingsValues } from "@/lib/validation/agent";
import { cn } from "@/lib/utils";

/**
 * Chip row inserting a {{variable}} at the caret of the owning textarea:
 * platform built-ins first, then the agent's declared variables.
 */
export function VariableInserter({
  onInsert,
  disabled,
}: {
  onInsert: (name: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("agents.sections.conversation");
  const { control } = useFormContext<AgentSettingsValues>();
  const declared = useWatch({ control, name: "dynamic_variables" });

  const chip = (name: string, custom: boolean) => (
    <button
      key={name}
      type="button"
      disabled={disabled}
      onClick={() => onInsert(name)}
      className={cn(
        "rounded-full border px-2.5 py-0.5 font-mono text-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
        custom
          ? "border-primary/40 text-primary hover:bg-primary/10"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {`{{${name}}}`}
    </button>
  );

  const declaredNames = declared
    .map((variable) => variable.name)
    .filter((name) => name !== "");

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{t("insertLabel")}</span>
      {BUILTIN_VARIABLES.map((name) => chip(name, false))}
      {declaredNames.map((name) => chip(name, true))}
    </div>
  );
}
