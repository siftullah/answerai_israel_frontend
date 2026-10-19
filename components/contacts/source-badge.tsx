import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

type Source = "manual" | "ai";

const SOURCE_VARIANTS: Record<Source, "secondary" | "info"> = {
  manual: "secondary",
  ai: "info",
};

/** Who created the record — a person, or the AI mid-call. Shared by the
 * contacts and DNC tables. */
export function SourceBadge({ source }: { source: Source }) {
  const t = useTranslations("contacts.source");
  const labels: Record<Source, string> = { manual: t("manual"), ai: t("ai") };
  return <Badge variant={SOURCE_VARIANTS[source]}>{labels[source]}</Badge>;
}
