import type { AgentScope } from "./knowledge";

export interface FaqCategory {
  id: string;
  name: string;
  faqs_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category?: FaqCategory | null;
  /** Owner uuids — present only when the relations were loaded; null = business-wide. */
  service_id?: string | null;
  product_id?: string | null;
  agent_scope: AgentScope;
  /** Only present on business-wide FAQs (owned FAQs enable via their owner). */
  agent_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface FaqPayload {
  question?: string;
  answer?: string;
  faq_category_id?: string | null;
  service_id?: string | null;
  product_id?: string | null;
  agent_scope?: AgentScope;
  agent_ids?: string[];
}

export interface FaqListFilters {
  service_id?: string;
  product_id?: string;
  category_id?: string;
}
