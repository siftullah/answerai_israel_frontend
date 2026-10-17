import type { AgentScope } from "./knowledge";

export type DocumentSourceType = "file" | "url" | "text" | "integration";
export type DocumentStatus = "uploading" | "processing" | "ready" | "error";

export interface KnowledgeDocumentFile {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  created_at: string;
}

/** Named to avoid clashing with the DOM's global Document. */
export interface KnowledgeDocument {
  id: string;
  source_type: DocumentSourceType;
  name: string;
  description: string | null;
  source_url: string | null;
  status: DocumentStatus;
  error: string | null;
  file: KnowledgeDocumentFile | null;
  /** The integration feed that materialized this doc (null for manual docs).
   * Integration docs are system-managed — the API rejects edit/delete. */
  integration: {
    provider: string | null;
    provider_name: string | null;
    feed: string | null;
    feed_name: string | null;
  } | null;
  agent_scope: AgentScope;
  agent_ids: string[];
  created_at: string;
  updated_at: string;
}

/**
 * The show-route shape: adds the content body and a signed (expiring) file
 * URL. Bodies can be 200KB, so the list endpoint never carries them.
 * `body` is null for file docs and for legacy URL docs the voice engine
 * fetched itself.
 */
export interface KnowledgeDocumentDetail extends KnowledgeDocument {
  body: string | null;
  file: (KnowledgeDocumentFile & { url: string }) | null;
}

export interface CreateDocumentPayload {
  /** "integration" is system-only and not creatable via the API. */
  source_type: "file" | "url" | "text";
  name: string;
  description?: string;
  file?: File;
  source_url?: string;
  text?: string;
  agent_scope: AgentScope;
  agent_ids: string[];
}

/**
 * `description: null` clears it. `body` is accepted only for text docs and
 * extracted URL docs — file content is replaced via the dedicated file
 * endpoint. A body change re-syncs the doc (status returns to "uploading").
 */
export interface UpdateDocumentPayload {
  name?: string;
  description?: string | null;
  body?: string;
  agent_scope?: AgentScope;
  agent_ids?: string[];
}
