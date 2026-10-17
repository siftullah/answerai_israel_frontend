import { Badge } from "@/components/ui/badge";

type Source = "manual" | "ai";

const SOURCE_LABELS: Record<Source, string> = {
  manual: "Manual",
  ai: "AI",
};

const SOURCE_VARIANTS: Record<Source, "secondary" | "info"> = {
  manual: "secondary",
  ai: "info",
};

/** Who created the record — a person, or the AI mid-call. Shared by the
 * contacts and DNC tables. */
export function SourceBadge({ source }: { source: Source }) {
  return <Badge variant={SOURCE_VARIANTS[source]}>{SOURCE_LABELS[source]}</Badge>;
}
