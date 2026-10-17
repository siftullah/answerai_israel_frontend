import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { PhoneNumberStatus } from "@/lib/api/types";

const TRANSITIONAL_LABELS: Partial<Record<PhoneNumberStatus, string>> = {
  purchasing: "Purchasing",
  configuring: "Configuring",
  releasing: "Releasing",
};

export function NumberStatusBadge({ status }: { status: PhoneNumberStatus }) {
  if (status === "active") return <Badge variant="success">Active</Badge>;
  if (status === "error") return <Badge variant="destructive">Error</Badge>;
  if (status === "released") return <Badge variant="ghost">Released</Badge>;
  return (
    <Badge variant="info" className="gap-1.5">
      <Spinner className="size-3" />
      {TRANSITIONAL_LABELS[status]}
    </Badge>
  );
}
