"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/errors";
import type {
  CreateDocumentPayload,
  KnowledgeDocument,
  KnowledgeDocumentDetail,
  UpdateDocumentPayload,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/** Keeps polling while any doc is still uploading/processing. */
export function useDocuments(businessUuid: string) {
  return useQuery<KnowledgeDocument[], ApiError>({
    queryKey: queryKeys.business(businessUuid, "documents"),
    queryFn: () =>
      api
        .get<{ data: KnowledgeDocument[] }>(endpoints.documents.index)
        .then((r) => r.data.data),
    refetchInterval: (query) =>
      query.state.data?.some(
        (doc) => doc.status === "uploading" || doc.status === "processing"
      )
        ? 4000
        : false,
  });
}

/** Detail (with body + signed file URL) — pass null until a surface opens. */
export function useDocument(businessUuid: string, docUuid: string | null) {
  return useQuery<KnowledgeDocumentDetail, ApiError>({
    queryKey: queryKeys.business(businessUuid, "documents", "detail", docUuid ?? ""),
    queryFn: () =>
      api
        .get<{ data: KnowledgeDocumentDetail }>(endpoints.documents.show(docUuid ?? ""))
        .then((r) => r.data.data),
    enabled: docUuid !== null,
  });
}

function invalidateDocuments(businessUuid: string) {
  return { queryKey: queryKeys.business(businessUuid, "documents") };
}

export function useCreateDocument(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<KnowledgeDocument, ApiError, CreateDocumentPayload>({
    mutationFn: (payload) => {
      let body: FormData | Omit<CreateDocumentPayload, "file">;
      if (payload.source_type === "file" && payload.file) {
        const form = new FormData();
        form.append("source_type", "file");
        form.append("name", payload.name);
        if (payload.description) form.append("description", payload.description);
        form.append("file", payload.file);
        form.append("agent_scope", payload.agent_scope);
        payload.agent_ids.forEach((id) => form.append("agent_ids[]", id));
        body = form;
      } else {
        body = payload;
      }
      return api
        .post<{ data: KnowledgeDocument }>(endpoints.documents.index, body)
        .then((r) => r.data.data);
    },
    onSuccess: () => queryClient.invalidateQueries(invalidateDocuments(businessUuid)),
  });
}

export function useUpdateDocument(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<KnowledgeDocumentDetail, ApiError, { id: string; payload: UpdateDocumentPayload }>({
    mutationFn: ({ id, payload }) =>
      api
        .patch<{ data: KnowledgeDocumentDetail }>(endpoints.documents.show(id), payload)
        .then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries(invalidateDocuments(businessUuid)),
  });
}

/** Swaps a file doc's file for a new version — the sync replaces the workspace copy. */
export function useReplaceDocumentFile(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<KnowledgeDocumentDetail, ApiError, { id: string; file: File }>({
    mutationFn: ({ id, file }) => {
      const form = new FormData();
      form.append("file", file);
      return api
        .post<{ data: KnowledgeDocumentDetail }>(endpoints.documents.file(id), form)
        .then((r) => r.data.data);
    },
    onSuccess: () => queryClient.invalidateQueries(invalidateDocuments(businessUuid)),
  });
}

export function useDeleteDocument(businessUuid: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(endpoints.documents.show(id)).then(() => undefined),
    onSuccess: () => queryClient.invalidateQueries(invalidateDocuments(businessUuid)),
  });
}
