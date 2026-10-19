"use client";

import { useTranslations } from "next-intl";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { useBusiness } from "@/components/business/business-provider";
import { AgentSection } from "@/components/agents/detail/agent-section";
import { toolGroups, toolLabel } from "@/lib/agents/tool-catalog";
import type { AgentSettingsValues } from "@/lib/validation/agent";
import { cn } from "@/lib/utils";

export function ToolsSection() {
  const t = useTranslations("agents.sections.tools");
  const { modules } = useBusiness();
  const form = useFormContext<AgentSettingsValues>();
  const { disabled } = form.formState;
  const purpose = useWatch({ control: form.control, name: "purpose" });

  const groups = toolGroups(modules);

  return (
    <AgentSection id="tools" title={t("title")} description={t("description")}>
      <Controller
        control={form.control}
        name="action_tools"
        render={({ field }) => (
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <div key={group.key} className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-medium">{group.label}</p>
                  {!group.enabled && (
                    <p className="text-sm text-muted-foreground">
                      {t("enableModule", { module: group.label })}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2.5">
                  {group.tools.map((tool) => {
                    const { label, description } = toolLabel(tool);
                    const checked = field.value.includes(tool);
                    const strandedTool = checked && !group.enabled;
                    return (
                      <label
                        key={tool}
                        className={cn(
                          "group/field flex items-start gap-3",
                          (!group.enabled || disabled) && "cursor-default"
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={disabled || !group.enabled}
                          onCheckedChange={(value) =>
                            field.onChange(
                              value
                                ? [...field.value, tool]
                                : field.value.filter((entry) => entry !== tool)
                            )
                          }
                          className="mt-0.5"
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="text-sm font-medium">{label}</span>
                          {description && (
                            <span className="text-sm text-muted-foreground">{description}</span>
                          )}
                          {strandedTool && (
                            <span className="text-sm text-warning">
                              {t("stranded", { module: group.label })}
                            </span>
                          )}
                          {tool === "lookup_contact" && purpose === "inbound" && checked && (
                            <span className="text-sm text-muted-foreground">
                              {t("lookupInboundNote")}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      />
    </AgentSection>
  );
}
