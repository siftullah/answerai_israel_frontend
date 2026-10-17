"use client";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { KnowledgeDocument } from "@/lib/api/types";

export function DocStatusBadge({ doc }: { doc: Pick<KnowledgeDocument, "status"> }) {
  if (doc.status === "ready") return <Badge variant="success">Ready</Badge>;
  if (doc.status === "error") return <Badge variant="destructive">Error</Badge>;
  return (
    <Badge variant="info" className="gap-1.5">
      <Spinner className="size-3" />
      {doc.status === "uploading" ? "Uploading" : "Processing"}
    </Badge>
  );
}
