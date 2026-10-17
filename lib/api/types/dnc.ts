/** Mirrors app/Http/Resources/DncEntryResource.php */

export const DNC_SOURCES = ["manual", "ai"] as const;
export type DncSource = (typeof DNC_SOURCES)[number];

export interface DncEntry {
  id: string;
  e164: string;
  reason: string | null;
  source: DncSource;
  /** User name; null when the AI added the entry. */
  added_by: string | null;
  /** Server-side join; soft-deleted contacts resolve to null. */
  contact: { id: string; name: string | null } | null;
  created_at: string;
  updated_at: string;
}

/** POST is restore-or-create: re-posting an existing number updates its
 * reason and flips source back to manual — always a 201. */
export interface DncEntryPayload {
  e164: string;
  reason?: string | null;
}

export interface DncListFilters {
  q?: string;
  source?: DncSource;
  sort?: "newest" | "oldest";
}
