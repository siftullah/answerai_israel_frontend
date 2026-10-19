"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { AgentScopeField } from "@/components/business-profile/agent-scope-field";
import { EntityModal } from "@/components/business-profile/entity-modal";
import { useBusiness } from "@/components/business/business-provider";
import { useCreateDocument } from "@/hooks/use-documents";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { displayLocale } from "@/lib/i18n/runtime";
import {
  MAX_DOCUMENT_TEXT,
  documentCreateSchema,
  type DocumentCreateValues,
} from "@/lib/validation/document";

export const FILE_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".html"];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Add-doc modal with three sources: pasted text, uploaded file, or a URL extracted by AI. */
export function DocCreateModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { business } = useBusiness();
  const t = useTranslations("knowledge.docs");
  const ts = useTranslations("knowledge.shared");
  const tc = useTranslations("common");
  const create = useCreateDocument(business.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sourceOptions: {
    value: DocumentCreateValues["source_type"];
    title: string;
    description: string;
  }[] = [
    {
      value: "text",
      title: t("create.sources.textTitle"),
      description: t("create.sources.textDescription"),
    },
    {
      value: "file",
      title: t("create.sources.fileTitle"),
      description: t("create.sources.fileDescription"),
    },
    {
      value: "url",
      title: t("create.sources.urlTitle"),
      description: t("create.sources.urlDescription"),
    },
  ];

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const tv = useTranslations("validation");
  const schema = useMemo(() => documentCreateSchema(tv), [tv]);
  const form = useForm<DocumentCreateValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      source_type: "text",
      name: "",
      description: "",
      source_url: "",
      text: "",
      agent_scope: "all",
      agent_ids: [],
    },
  });
  const { errors } = form.formState;
  const sourceType = form.watch("source_type");
  const textLength = form.watch("text").length;

  const pickFile = (picked: File | undefined) => {
    if (!picked) return;
    const name = picked.name.toLowerCase();
    if (!FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      setFileError(t("form.invalidFileType"));
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      setFileError(ts("fileTooLarge"));
      return;
    }
    setFileError(null);
    setFile(picked);
    if (form.getValues("name").trim() === "") {
      form.setValue("name", picked.name.replace(/\.[^.]+$/, ""), { shouldDirty: true });
    }
  };

  const requireFile = () => {
    if (form.getValues("source_type") === "file" && !file) {
      setFileError(t("form.fileRequired"));
      return false;
    }
    return true;
  };

  const onSubmit = form.handleSubmit((values) => {
    if (values.source_type === "file" && !file) {
      setFileError(t("form.fileRequired"));
      return;
    }
    create.mutate(
      {
        source_type: values.source_type,
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        file: values.source_type === "file" ? (file ?? undefined) : undefined,
        source_url: values.source_type === "url" ? values.source_url.trim() : undefined,
        text: values.source_type === "text" ? values.text : undefined,
        agent_scope: values.agent_scope,
        agent_ids: values.agent_scope === "selected" ? values.agent_ids : [],
      },
      {
        onSuccess: () => {
          toast.success(t("toasts.added"));
          onOpenChange(false);
        },
        onError: (error) => applyServerErrors(form, error),
      }
    );
  });

  return (
    <FormProvider {...form}>
      <EntityModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("add")}
        onSubmit={onSubmit}
        submitLabel={t("add")}
        pending={create.isPending}
        isDirty={form.formState.isDirty || file !== null}
        steps={[
          {
            title: t("create.sourceStep"),
            fields: ["source_type", "name", "description", "source_url", "text"],
            validate: requireFile,
            content: (
              <>
                <Controller
                  control={form.control}
                  name="source_type"
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as string)}
                      className="grid gap-2 sm:grid-cols-3"
                    >
                      {sourceOptions.map((option) => (
                        <FieldLabel
                          key={option.value}
                          htmlFor={`doc-source-${option.value}`}
                        >
                          <Field orientation="horizontal">
                            <FieldContent>
                              <FieldTitle>{option.title}</FieldTitle>
                              <FieldDescription>{option.description}</FieldDescription>
                            </FieldContent>
                            <RadioGroupItem
                              value={option.value}
                              id={`doc-source-${option.value}`}
                            />
                          </Field>
                        </FieldLabel>
                      ))}
                    </RadioGroup>
                  )}
                />

                {sourceType === "file" && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={FILE_EXTENSIONS.join(",")}
                        className="hidden"
                        onChange={(event) => {
                          pickFile(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <UploadIcon />
                        {ts("chooseFile")}
                      </Button>
                      <span className="truncate text-sm text-muted-foreground">
                        {file ? file.name : t("form.fileTypesHint")}
                      </span>
                    </div>
                    {fileError && <p className="text-sm text-destructive">{fileError}</p>}
                  </div>
                )}

                {sourceType === "url" && (
                  <Field data-invalid={!!errors.source_url || undefined}>
                    <FieldLabel htmlFor="doc-url">{t("create.pageUrl")}</FieldLabel>
                    <Input
                      id="doc-url"
                      type="url"
                      placeholder="https://yourbusiness.co.il/pricing"
                      autoComplete="off"
                      aria-invalid={!!errors.source_url}
                      {...form.register("source_url")}
                    />
                    <FieldDescription>{t("create.urlHint")}</FieldDescription>
                    {errors.source_url && (
                      <FieldError>{errors.source_url.message}</FieldError>
                    )}
                  </Field>
                )}

                {sourceType === "text" && (
                  <Field data-invalid={!!errors.text || undefined}>
                    <FieldLabel htmlFor="doc-text">{t("create.text")}</FieldLabel>
                    <Textarea
                      id="doc-text"
                      className="min-h-64"
                      placeholder={t("create.textPlaceholder")}
                      aria-invalid={!!errors.text}
                      {...form.register("text")}
                    />
                    <p className="text-end text-sm text-muted-foreground">
                      {ts("charCount", {
                        length: textLength.toLocaleString(displayLocale()),
                        max: MAX_DOCUMENT_TEXT.toLocaleString(displayLocale()),
                      })}
                    </p>
                    {errors.text && <FieldError>{errors.text.message}</FieldError>}
                  </Field>
                )}

                <Field data-invalid={!!errors.name || undefined}>
                  <FieldLabel htmlFor="doc-name">{tc("labels.name")}</FieldLabel>
                  <Input
                    id="doc-name"
                    placeholder={t("form.namePlaceholder")}
                    autoComplete="off"
                    aria-invalid={!!errors.name}
                    {...form.register("name")}
                  />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>

                <Field data-invalid={!!errors.description || undefined}>
                  <FieldLabel htmlFor="doc-description">
                    {t("form.descriptionOptional")}
                  </FieldLabel>
                  <Textarea
                    id="doc-description"
                    className="min-h-24"
                    placeholder={t("form.descriptionPlaceholder")}
                    aria-invalid={!!errors.description}
                    {...form.register("description")}
                  />
                  {errors.description && (
                    <FieldError>{errors.description.message}</FieldError>
                  )}
                </Field>
              </>
            ),
          },
          {
            title: ts("steps.agents"),
            fields: ["agent_scope", "agent_ids"],
            content: <AgentScopeField idPrefix="doc" />,
          },
        ]}
      />
    </FormProvider>
  );
}
