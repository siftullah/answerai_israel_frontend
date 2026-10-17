"use client";

import { useRef, useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLinkIcon, FileIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AgentScopeField } from "@/components/business-profile/agent-scope-field";
import { EntityModal, type EntityModalStep } from "@/components/business-profile/entity-modal";
import {
  FILE_EXTENSIONS,
  MAX_FILE_BYTES,
} from "@/components/business-profile/docs/doc-create-modal";
import { useBusiness } from "@/components/business/business-provider";
import {
  useDocument,
  useReplaceDocumentFile,
  useUpdateDocument,
} from "@/hooks/use-documents";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import type { ApiError } from "@/lib/api/errors";
import type {
  KnowledgeDocument,
  KnowledgeDocumentDetail,
  UpdateDocumentPayload,
} from "@/lib/api/types";
import {
  MAX_DOCUMENT_TEXT,
  documentContentEditSchema,
  documentEditSchema,
  type DocumentContentEditValues,
  type DocumentEditValues,
} from "@/lib/validation/document";

/** Name + description — identical in both edit variants. */
function NameFields() {
  const form = useFormContext<DocumentEditValues>();
  const { errors } = form.formState;

  return (
    <>
      <Field data-invalid={!!errors.name || undefined}>
        <FieldLabel htmlFor="doc-edit-name">Name</FieldLabel>
        <Input
          id="doc-edit-name"
          placeholder="Pricing guide"
          autoComplete="off"
          aria-invalid={!!errors.name}
          {...form.register("name")}
        />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.description || undefined}>
        <FieldLabel htmlFor="doc-edit-description">Description (optional)</FieldLabel>
        <Textarea
          id="doc-edit-description"
          className="min-h-24"
          placeholder="What this doc covers — helps you and your AI find it."
          aria-invalid={!!errors.description}
          {...form.register("description")}
        />
        {errors.description && <FieldError>{errors.description.message}</FieldError>}
      </Field>
    </>
  );
}

function toPayload(values: DocumentEditValues): UpdateDocumentPayload {
  return {
    name: values.name.trim(),
    description: values.description.trim() === "" ? null : values.description.trim(),
    agent_scope: values.agent_scope,
    agent_ids: values.agent_scope === "selected" ? values.agent_ids : [],
  };
}

/** Text docs and extracted URL docs — content is editable inline. */
function DocContentEditForm({
  detail,
  onOpenChange,
}: {
  detail: KnowledgeDocumentDetail;
  onOpenChange: (open: boolean) => void;
}) {
  const { business } = useBusiness();
  const update = useUpdateDocument(business.id);

  const form = useForm<DocumentContentEditValues>({
    resolver: zodResolver(documentContentEditSchema),
    defaultValues: {
      name: detail.name,
      description: detail.description ?? "",
      body: detail.body ?? "",
      agent_scope: detail.agent_scope,
      agent_ids: detail.agent_ids,
    },
  });
  const { errors, dirtyFields } = form.formState;
  const bodyLength = form.watch("body").length;

  const onSubmit = form.handleSubmit((values) => {
    const contentChanged = dirtyFields.body === true;
    update.mutate(
      {
        id: detail.id,
        payload: {
          ...toPayload(values),
          // Only send the body when it changed — an untouched body skips the
          // whole re-sync round-trip.
          ...(contentChanged ? { body: values.body } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success(contentChanged ? "Doc saved — re-syncing now" : "Doc saved");
          onOpenChange(false);
        },
        onError: (error) => applyServerErrors(form, error),
      }
    );
  });

  const steps: EntityModalStep[] = [
    {
      title: "Name",
      fields: ["name", "description"],
      content: <NameFields />,
    },
    {
      title: "Content",
      fields: ["body"],
      content: (
        <Field data-invalid={!!errors.body || undefined}>
          {detail.source_type === "url" && detail.source_url && (
            <a
              href={detail.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <span className="truncate">{detail.source_url}</span>
              <ExternalLinkIcon className="size-3.5 shrink-0" />
            </a>
          )}
          <FieldLabel htmlFor="doc-edit-body">Content</FieldLabel>
          <Textarea
            id="doc-edit-body"
            className="min-h-64"
            aria-invalid={!!errors.body}
            {...form.register("body")}
          />
          <p className="text-right text-sm text-muted-foreground">
            {bodyLength.toLocaleString()} / {MAX_DOCUMENT_TEXT.toLocaleString()}
          </p>
          {errors.body && <FieldError>{errors.body.message}</FieldError>}
        </Field>
      ),
    },
    {
      title: "Agents",
      fields: ["agent_scope", "agent_ids"],
      content: <AgentScopeField idPrefix="doc-edit" />,
    },
  ];

  return (
    <FormProvider {...form}>
      <EntityModal
        open
        onOpenChange={onOpenChange}
        title="Edit doc"
        onSubmit={onSubmit}
        submitLabel="Save changes"
        pending={update.isPending}
        isDirty={form.formState.isDirty}
        steps={steps}
      />
    </FormProvider>
  );
}

/** File docs (replace-the-file) and URL docs whose body hasn't landed. */
function DocMetaEditForm({
  detail,
  onOpenChange,
}: {
  detail: KnowledgeDocumentDetail;
  onOpenChange: (open: boolean) => void;
}) {
  const { business } = useBusiness();
  const update = useUpdateDocument(business.id);
  const replaceFile = useReplaceDocumentFile(business.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newFile, setNewFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const form = useForm<DocumentEditValues>({
    resolver: zodResolver(documentEditSchema),
    defaultValues: {
      name: detail.name,
      description: detail.description ?? "",
      agent_scope: detail.agent_scope,
      agent_ids: detail.agent_ids,
    },
  });

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
    setNewFile(picked);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync({ id: detail.id, payload: toPayload(values) });
    } catch (error) {
      applyServerErrors(form, error as ApiError);
      return;
    }

    if (newFile) {
      try {
        await replaceFile.mutateAsync({ id: detail.id, file: newFile });
      } catch (error) {
        toast.error((error as ApiError).message);
        return;
      }
    }

    toast.success(newFile ? "Doc saved — re-syncing now" : "Doc saved");
    onOpenChange(false);
  });

  const preparing = detail.status === "uploading" || detail.status === "processing";

  const steps: EntityModalStep[] = [
    {
      title: "Name",
      fields: ["name", "description"],
      content: (
        <>
          <NameFields />
          {detail.source_type === "url" && (
            <p className="text-sm text-muted-foreground">
              {preparing
                ? "The content is still being prepared — you can edit it once it's ready."
                : "Content for this doc is fetched from the source URL by the voice engine and can't be edited here."}
            </p>
          )}
        </>
      ),
    },
    ...(detail.source_type === "file"
      ? [
          {
            title: "File",
            fields: [],
            content: (
              <div className="flex flex-col gap-3">
                {detail.file && (
                  <div className="flex items-center gap-3 rounded-xl border p-4">
                    <FileIcon className="size-5 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium">{detail.file.name}</p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  File content can&apos;t be edited inline — upload a new version to
                  replace it.
                </p>
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
                    Choose replacement
                  </Button>
                  <span className="truncate text-sm text-muted-foreground">
                    {newFile
                      ? `${newFile.name} — replaces on save`
                      : "PDF, DOCX, TXT, MD or HTML — up to 10 MB"}
                  </span>
                </div>
                {fileError && <p className="text-sm text-destructive">{fileError}</p>}
              </div>
            ),
          } satisfies EntityModalStep,
        ]
      : []),
    {
      title: "Agents",
      fields: ["agent_scope", "agent_ids"],
      content: <AgentScopeField idPrefix="doc-edit" />,
    },
  ];

  return (
    <FormProvider {...form}>
      <EntityModal
        open
        onOpenChange={onOpenChange}
        title="Edit doc"
        onSubmit={onSubmit}
        submitLabel="Save changes"
        pending={update.isPending || replaceFile.isPending}
        isDirty={form.formState.isDirty || newFile !== null}
        steps={steps}
      />
    </FormProvider>
  );
}

/**
 * Fetches the doc detail (the list payload carries no body), then mounts the
 * right edit variant: inline content editing for text/extracted-URL docs,
 * metadata + file replacement for the rest.
 */
export function DocEditModal({
  open,
  onOpenChange,
  doc,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: KnowledgeDocument;
}) {
  const { business } = useBusiness();
  const detailQuery = useDocument(business.id, open ? doc.id : null);

  if (!detailQuery.isSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit doc</DialogTitle>
          </DialogHeader>
          {detailQuery.isError ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-destructive">{detailQuery.error.message}</p>
              <Button variant="outline" size="sm" onClick={() => detailQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  const detail = detailQuery.data;
  const contentEditable =
    detail.source_type === "text" ||
    (detail.source_type === "url" && detail.body !== null);

  return contentEditable ? (
    <DocContentEditForm key={detail.id} detail={detail} onOpenChange={onOpenChange} />
  ) : (
    <DocMetaEditForm key={detail.id} detail={detail} onOpenChange={onOpenChange} />
  );
}
