"use client";

import { useRef } from "react";
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

const WARNING_FIELD_LABELS: Record<string, string> = {
  first_message: "First message",
  prompt_text: "Instructions",
};

export function ConversationSection({
  warnings,
  onDismissWarnings,
}: {
  warnings: AgentConfigWarning[];
  onDismissWarnings: () => void;
}) {
  const form = useFormContext<AgentSettingsValues>();
  const { errors, disabled } = form.formState;

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
    <AgentSection
      id="conversation"
      title="Conversation"
      description="What the agent says first, and the instructions it follows."
    >
      {warnings.length > 0 && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>Saved with advisories</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {warnings.map((warning, index) => (
                <li key={index}>
                  {WARNING_FIELD_LABELS[warning.field] ?? warning.field}: {warning.issue}
                </li>
              ))}
            </ul>
          </AlertDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Dismiss advisories"
            className="absolute top-2 right-2 text-warning hover:bg-warning/10 hover:text-warning"
            onClick={onDismissWarnings}
          >
            <XIcon />
          </Button>
        </Alert>
      )}

      <Field data-invalid={!!errors.first_message || undefined}>
        <FieldLabel htmlFor="agent-first-message">First message</FieldLabel>
        <Textarea
          id="agent-first-message"
          rows={2}
          placeholder="Thanks for calling {{business_name}}, this is {{agent_name}} — how can I help?"
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
          Spoken as the call connects. Leave empty to let the agent open naturally.{" "}
          {firstMessage.length} / 1,000
        </FieldDescription>
        {errors.first_message && <FieldError>{errors.first_message.message}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.prompt_text || undefined}>
        <FieldLabel htmlFor="agent-prompt">Instructions</FieldLabel>
        <Textarea
          id="agent-prompt"
          rows={14}
          placeholder="You are {{agent_name}}, the friendly receptionist for {{business_name}}…"
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
          The agent&apos;s personality, rules and job. {promptText.length.toLocaleString()} /
          30,000
        </FieldDescription>
        {errors.prompt_text && <FieldError>{errors.prompt_text.message}</FieldError>}
      </Field>
    </AgentSection>
  );
}
