"use client";

import { useTranslations } from "next-intl";
import { LayoutGridIcon, Rows3Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/hooks/use-view-mode";

/** Segmented table⇄cards switch shown above every section list. */
export function ViewModeToggle({
  mode,
  onChange,
  className,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}) {
  const t = useTranslations("businessProfile.viewMode");

  const options = [
    { value: "table", icon: Rows3Icon, label: t("table") },
    { value: "cards", icon: LayoutGridIcon, label: t("cards") },
  ] as const;

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-full bg-muted p-1",
        className
      )}
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            mode === value
              ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
