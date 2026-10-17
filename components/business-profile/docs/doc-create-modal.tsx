"use client";

import { useRef, useState } from "react";
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
import {
  MAX_DOCUMENT_TEXT,
  documentCreateSchema,
  type DocumentCreateValues,
} from "@/lib/validation/document";

export const FILE_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".html"];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const SOURCE_OPTIONS: {
  value: DocumentCreateValues["source_type"];
  title: string;
  description: string;
}[] = [
  { value: "text", title: "Paste text", description: "Type or paste the content." },
  { value: "file", title: "Upload file", description: "PDF, DOCX, TXT, MD or HTML." },
  { value: "url", title: "Extract from URL", description: "AI reads a web page." },
];

/** Add-doc modal with three sources: pasted text, uploaded file, or a URL extracted by AI. */
export function DocCreateModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { business } = useBusiness();
  const create = useCreateDocument(business.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const form = useForm<DocumentCreateValues>({
    resolver: zodResolver(documentCreateSchema),
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
      setFileError("Use a PDF, DOCX, TXT, MD or HTML file.");
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      setFileError("The file must be 10 MB or smaller.");
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
      setFileError("Choose a file to upload.");
      return false;
    }
    return true;
  };

  const onSubmit = form.handleSubmit((values) => {
    if (values.source_type === "file" && !file) {
      setFileError("Choose a file to upload.");
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
          toast.success("Doc added — it'll be ready shortly");
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
        title="Add doc"
        onSubmit={onSubmit}
        submitLabel="Add doc"
        pending={create.isPending}
        isDirty={form.formState.isDirty || file !== null}
        steps={[
          {
            title: "Source",
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
                      {SOURCE_OPTIONS.map((option) => (
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
                        Choose file
                      </Button>
                      <span className="truncate text-sm text-muted-foreground">
                        {file ? file.name : "PDF, DOCX, TXT, MD or HTML — up to 10 MB"}
                      </span>
                    </div>
                    {fileError && <p className="text-sm text-destructive">{fileError}</p>}
                  </div>
                )}

                {sourceType === "url" && (
                  <Field data-invalid={!!errors.source_url || undefined}>
                    <FieldLabel htmlFor="doc-url">Page URL</FieldLabel>
                    <Input
                      id="doc-url"
                      type="url"
                      placeholder="https://yourbusiness.com.au/pricing"
                      autoComplete="off"
                      aria-invalid={!!errors.source_url}
                      {...form.register("source_url")}
                    />
                    <FieldDescription>
                      We&apos;ll fetch the page and clean it up with AI — you can
                      review and edit the content once it&apos;s ready.
                    </FieldDescription>
                    {errors.source_url && (
                      <FieldError>{errors.source_url.message}</FieldError>
                    )}
                  </Field>
                )}

                {sourceType === "text" && (
                  <Field data-invalid={!!errors.text || undefined}>
                    <FieldLabel htmlFor="doc-text">Text</FieldLabel>
                    <Textarea
                      id="doc-text"
                      className="min-h-64"
                      placeholder="Paste the document's contents — your AI reads all of it."
                      aria-invalid={!!errors.text}
                      {...form.register("text")}
                    />
                    <p className="text-right text-sm text-muted-foreground">
                      {textLength.toLocaleString()} / {MAX_DOCUMENT_TEXT.toLocaleString()}
                    </p>
                    {errors.text && <FieldError>{errors.text.message}</FieldError>}
                  </Field>
                )}

                <Field data-invalid={!!errors.name || undefined}>
                  <FieldLabel htmlFor="doc-name">Name</FieldLabel>
                  <Input
                    id="doc-name"
                    placeholder="Pricing guide"
                    autoComplete="off"
                    aria-invalid={!!errors.name}
                    {...form.register("name")}
                  />
                  {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>

                <Field data-invalid={!!errors.description || undefined}>
                  <FieldLabel htmlFor="doc-description">Description (optional)</FieldLabel>
                  <Textarea
                    id="doc-description"
                    className="min-h-24"
                    placeholder="What this doc covers — helps you and your AI find it."
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
            title: "Agents",
            fields: ["agent_scope", "agent_ids"],
            content: <AgentScopeField idPrefix="doc" />,
          },
        ]}
      />
    </FormProvider>
  );
}
