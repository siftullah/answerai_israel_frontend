"use client";

import { useTranslations } from "next-intl";
import { PhoneIcon, Settings2Icon, UsersIcon, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { CampaignStats } from "@/lib/api/types";

export type CampaignTab = "recipients" | "calls" | "settings";

type Tone = "primary" | "cta" | "neutral";

/**
 * Per-tab hue. The icon chip fills solid on the active tab (swapped in JS off
 * the current value) and sits as a soft tint otherwise; the active card look
 * rides data-active: variants, whose [data-active] specificity beats the idle
 * classes and lets twMerge dedupe the base pill recipe cleanly.
 */
const TAB_TONE: Record<
  Tone,
  { chipActive: string; chipIdle: string; card: string }
> = {
  primary: {
    chipActive: "bg-primary text-primary-foreground",
    chipIdle: "bg-primary/10 text-primary dark:bg-primary/20",
    card: "data-active:border-primary/50 data-active:bg-primary/5 data-active:ring-primary/15 dark:data-active:border-primary/50 dark:data-active:bg-primary/10",
  },
  cta: {
    chipActive: "bg-cta text-cta-foreground",
    chipIdle: "bg-cta/10 text-cta dark:bg-cta/20",
    card: "data-active:border-cta/50 data-active:bg-cta/5 data-active:ring-cta/15 dark:data-active:border-cta/50 dark:data-active:bg-cta/10",
  },
  neutral: {
    chipActive: "bg-foreground text-background",
    chipIdle: "bg-muted text-muted-foreground",
    card: "data-active:border-foreground/25 data-active:bg-muted/60 data-active:ring-foreground/10 dark:data-active:border-foreground/20 dark:data-active:bg-muted/40",
  },
};

// Card-sized triggers doubling as a summary. Overrides ride the default variant
// so twMerge dedupes the base pill recipe; the ring/shadow only show when active.
const BASE_TRIGGER = cn(
  "h-auto min-w-0 flex-row items-center justify-start gap-3 rounded-2xl border-border bg-card p-4 text-start whitespace-normal shadow-xs transition-all",
  "hover:bg-muted/40 hover:shadow-sm",
  "after:hidden",
  "data-active:ring-1 data-active:shadow-sm"
);

function TabCard({
  value,
  label,
  subtitle,
  icon: Icon,
  tone,
  active,
  count,
}: {
  value: CampaignTab;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  tone: Tone;
  active: boolean;
  count?: number;
}) {
  const t = TAB_TONE[tone];
  return (
    <TabsTrigger value={value} className={cn(BASE_TRIGGER, t.card)}>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          active ? t.chipActive : t.chipIdle
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="font-medium text-foreground">{label}</span>
          {count !== undefined && (
            <Badge variant="secondary" className="tabular-nums">
              {count}
            </Badge>
          )}
        </span>
        <span className="truncate text-sm font-normal text-muted-foreground">{subtitle}</span>
      </span>
    </TabsTrigger>
  );
}

export function CampaignTabs({
  tab,
  onTabChange,
  stats,
  recipients,
  calls,
  settings,
}: {
  tab: CampaignTab;
  onTabChange: (tab: CampaignTab) => void;
  stats: CampaignStats;
  recipients: React.ReactNode;
  calls: React.ReactNode;
  settings: React.ReactNode;
}) {
  const t = useTranslations("campaigns.tabs");
  const tc = useTranslations("common");
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => onTabChange(value as CampaignTab)}
      className="gap-4"
    >
      <TabsList className="grid w-full grid-cols-3 gap-3 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto">
        <TabCard
          value="recipients"
          label={t("recipients")}
          subtitle={t("recipientsSubtitle")}
          icon={UsersIcon}
          tone="primary"
          active={tab === "recipients"}
          count={stats.total}
        />
        <TabCard
          value="calls"
          label={t("calls")}
          subtitle={t("callsSubtitle")}
          icon={PhoneIcon}
          tone="cta"
          active={tab === "calls"}
        />
        <TabCard
          value="settings"
          label={tc("labels.settings")}
          subtitle={t("settingsSubtitle")}
          icon={Settings2Icon}
          tone="neutral"
          active={tab === "settings"}
        />
      </TabsList>

      <TabsContent value="recipients">{recipients}</TabsContent>
      <TabsContent value="calls">{calls}</TabsContent>
      {/* keepMounted: the settings form must survive tab switches, or dirty
          edits (and the floating save bar) would vanish without warning. */}
      <TabsContent value="settings" keepMounted>
        {settings}
      </TabsContent>
    </Tabs>
  );
}
