import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { CreateExtractionPayload, Extraction } from "@/lib/api/types";

/**
 * Extractions are short-lived drafts polled imperatively by the
 * ExtractionDialog rather than cached queries — plain api calls, no hooks.
 */

export function createExtraction(payload: CreateExtractionPayload): Promise<Extraction> {
  let body: FormData | Omit<CreateExtractionPayload, "file">;
  if (payload.source_type === "file" && payload.file) {
    const form = new FormData();
    form.append("target", payload.target);
    form.append("source_type", "file");
    form.append("file", payload.file);
    body = form;
  } else {
    body = {
      target: payload.target,
      source_type: payload.source_type,
      source_url: payload.source_url,
    };
  }
  return api
    .post<{ data: Extraction }>(endpoints.extractions.index, body)
    .then((r) => r.data.data);
}

export function fetchExtraction(id: string): Promise<Extraction> {
  return api.get<{ data: Extraction }>(endpoints.extractions.show(id)).then((r) => r.data.data);
}

/** Best-effort cleanup of an abandoned run; the row is draft-only. */
export function discardExtraction(id: string): void {
  void api.delete(endpoints.extractions.show(id)).catch(() => undefined);
}
