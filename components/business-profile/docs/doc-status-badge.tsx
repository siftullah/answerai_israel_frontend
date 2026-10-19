"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { KnowledgeDocument } from "@/lib/api/types";

export function DocStatusBadge({ doc }: { doc: Pick<KnowledgeDocument, "status"> }) {
  const t = useTranslations("knowledge.docs.status");
  if (doc.status === "ready") return <Badge variant="success">{t("ready")}</Badge>;
  if (doc.status === "error") return <Badge variant="destructive">{t("error")}</Badge>;
  return (
    <Badge variant="info" className="gap-1.5">
      <Spinner className="size-3" />
      {doc.status === "uploading" ? t("uploading") : t("processing")}
    </Badge>
  );
}
