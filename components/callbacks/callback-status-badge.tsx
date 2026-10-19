import { useTranslations } from "next-intl";
import { BotIcon, UserRoundIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CallbackStatus, CallbackType } from "@/lib/api/types";
import {
  ACTIVE_CALLBACK_STATUSES,
  CALLBACK_STATUS_LABELS,
  CALLBACK_TYPE_LABELS,
} from "@/lib/api/types";

/**
 * Same ladder as jobs and appointments — tint for pending, fill for strong
 * states: scheduled is the upcoming blue tint, queued/in-progress the primary
 * fill (happening now, with the pulse). Statuses never wear neutral badges.
 */
const STATUS_VARIANTS: Record<
  CallbackStatus,
  "info" | "success" | "warning" | "destructive" | "default" | "canceled"
> = {
  scheduled: "info",
  queued: "default",
  in_progress: "default",
  completed: "success",
  no_answer: "warning",
  failed: "destructive",
  canceled: "canceled",
};

export function CallbackStatusBadge({ status }: { status: CallbackStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {ACTIVE_CALLBACK_STATUSES.includes(status) && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {CALLBACK_STATUS_LABELS[status]}
    </Badge>
  );
}

/** Rendered beside the status — overdue is a flag on top of `scheduled`, not a status. */
export function OverdueBadge() {
  const t = useTranslations("callbacks.badges");
  return <Badge variant="warning">{t("overdue")}</Badge>;
}

export function CallbackTypeIcon({
  type,
  className,
}: {
  type: CallbackType;
  className?: string;
}) {
  const Icon = type === "agent" ? BotIcon : UserRoundIcon;
  return (
    <Icon
      aria-label={CALLBACK_TYPE_LABELS[type]}
      className={cn("size-4 shrink-0 text-muted-foreground", className)}
    />
  );
}
