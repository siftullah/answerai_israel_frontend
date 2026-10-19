"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { TriangleAlertIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { AgentSection } from "@/components/agents/detail/agent-section";
import { VariableInserter } from "@/components/agents/detail/sections/variable-inserter";
import type { AgentConfigWarning } from "@/lib/api/types";
import type { AgentSettingsValues } from "@/lib/validation/agent";

const MAX_FIRST_MESSAGE_LENGTH = 1000;
const MAX_PROMPT_LENGTH = 30000;

export function ConversationSection({
  warnings,
  onDismissWarnings,
}: {
  warnings: AgentConfigWarning[];
  onDismissWarnings: () => void;
}) {
  const t = useTranslations("agents.sections.conversation");
  const ta = useTranslations("agents");
  const form = useFormContext<AgentSettingsValues>();
  const { errors, disabled } = form.formState;

  const warningFieldLabel = (field: string) =>
    field === "first_message"
      ? t("firstMessageLabel")
      : field === "prompt_text"
        ? t("instructionsLabel")
        : field;

  const firstMessageRef = useRef<HTMLTextAreaElement | null>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  const firstMessage = form.watch("first_message");
  const promptText = form.watch("prompt_text");

  const insertVariable = (
    field: "first_message" | "prompt_text",
    ref: React.RefObject<HTMLTextAreaElement | null>,
    name: string
  ) => {
    const token = `{{${name}}}`;
    const current = form.getValues(field);
    const element = ref.current;
    const start = element?.selectionStart ?? current.length;
    const end = element?.selectionEnd ?? start;
    form.setValue(field, current.slice(0, start) + token + current.slice(end), {
      shouldDirty: true,
      shouldValidate: true,
    });
    requestAnimationFrame(() => {
      if (!element) return;
      element.focus();
      const caret = start + token.length;
      element.setSelectionRange(caret, caret);
    });
  };

  const firstMessageField = form.register("first_message");
  const promptField = form.register("prompt_text");

  return (
    <AgentSection id="conversation" title={t("title")} description={t("description")}>
      {warnings.length > 0 && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>{t("advisories.title")}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc ps-4">
              {warnings.map((warning, index) => (
                <li key={index}>
                  {t("advisories.item", {
                    field: warningFieldLabel(warning.field),
                    issue: warning.issue,
                  })}
                </li>
              ))}
            </ul>
          </AlertDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t("advisories.dismiss")}
            className="absolute top-2 end-2 text-warning hover:bg-warning/10 hover:text-warning"
            onClick={onDismissWarnings}
          >
            <XIcon />
          </Button>
        </Alert>
      )}

      <Field data-invalid={!!errors.first_message || undefined}>
        <FieldLabel htmlFor="agent-first-message">{t("firstMessageLabel")}</FieldLabel>
        <Textarea
          id="agent-first-message"
          rows={2}
          placeholder={t("firstMessagePlaceholder", {
            businessToken: "{{business_name}}",
            agentToken: "{{agent_name}}",
          })}
          aria-invalid={!!errors.first_message}
          {...firstMessageField}
          ref={(element) => {
            firstMessageField.ref(element);
            firstMessageRef.current = element;
          }}
        />
        <VariableInserter
          disabled={disabled}
          onInsert={(name) => insertVariable("first_message", firstMessageRef, name)}
        />
        <FieldDescription>
          {t("firstMessageHint")}{" "}
          {ta("charCount", { count: firstMessage.length, max: MAX_FIRST_MESSAGE_LENGTH })}
        </FieldDescription>
        {errors.first_message && <FieldError>{errors.first_message.message}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.prompt_text || undefined}>
        <FieldLabel htmlFor="agent-prompt">{t("instructionsLabel")}</FieldLabel>
        <Textarea
          id="agent-prompt"
          rows={14}
          placeholder={t("instructionsPlaceholder", {
            businessToken: "{{business_name}}",
            agentToken: "{{agent_name}}",
          })}
          aria-invalid={!!errors.prompt_text}
          {...promptField}
          ref={(element) => {
            promptField.ref(element);
            promptRef.current = element;
          }}
        />
        <VariableInserter
          disabled={disabled}
          onInsert={(name) => insertVariable("prompt_text", promptRef, name)}
        />
        <FieldDescription>
          {t("instructionsHint")}{" "}
          {ta("charCount", { count: promptText.length, max: MAX_PROMPT_LENGTH })}
        </FieldDescription>
        {errors.prompt_text && <FieldError>{errors.prompt_text.message}</FieldError>}
      </Field>
    </AgentSection>
  );
}
