import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { PhoneNumberStatus } from "@/lib/api/types";

export function NumberStatusBadge({ status }: { status: PhoneNumberStatus }) {
  const t = useTranslations("phoneNumbers.status");
  const tc = useTranslations("common");

  if (status === "active") return <Badge variant="success">{tc("labels.active")}</Badge>;
  if (status === "error") return <Badge variant="destructive">{t("error")}</Badge>;
  if (status === "released") return <Badge variant="ghost">{t("released")}</Badge>;

  const transitionalLabels: Record<"purchasing" | "configuring" | "releasing", string> = {
    purchasing: t("purchasing"),
    configuring: t("configuring"),
    releasing: t("releasing"),
  };
  return (
    <Badge variant="info" className="gap-1.5">
      <Spinner className="size-3" />
      {transitionalLabels[status]}
    </Badge>
  );
}
