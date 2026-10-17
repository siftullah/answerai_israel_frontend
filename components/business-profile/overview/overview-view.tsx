"use client";

import Link from "next/link";
import { CircleCheckIcon, SparklesIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useBusiness } from "@/components/business/business-provider";
import {
  buildCompleteness,
  type SectionTile,
} from "@/components/business-profile/overview/completeness";
import { sectionGroups } from "@/components/business-profile/section-nav-config";
import { useBusinessCalendarSettings } from "@/hooks/use-business-calendar-settings";
import { useBusinessPolicies } from "@/hooks/use-business-policies";
import { useBusinessProfile } from "@/hooks/use-business-profile";
import { useDocuments } from "@/hooks/use-documents";
import { useFaqs } from "@/hooks/use-faqs";
import { useIntegrationProviders } from "@/hooks/use-integrations";
import { useMembers } from "@/hooks/use-members";
import { useProducts } from "@/hooks/use-products";
import { useServices } from "@/hooks/use-services";
import { useTransferTargets } from "@/hooks/use-transfer-targets";
import { cn } from "@/lib/utils";

/** Loading and errors both collapse to null — the tile shows "—". */
function dataOrNull<T>(query: { data?: T; isError: boolean }): T | null {
  return query.isError || query.data === undefined ? null : query.data;
}

const EXTRACT_SECTIONS: { title: string; segment: string }[] = [
  { title: "Basic info", segment: "business-profile/basic-info" },
  { title: "Services", segment: "business-profile/services" },
  { title: "Products", segment: "business-profile/products" },
  { title: "FAQs", segment: "business-profile/faqs" },
  { title: "Policies", segment: "business-profile/policies" },
  { title: "Docs", segment: "business-profile/docs" },
];

function StatTile({
  businessUuid,
  tile,
  icon: Icon,
}: {
  businessUuid: string;
  tile: SectionTile;
  icon: LucideIcon;
}) {
  const isCount = tile.stat !== null && /^\d+$/.test(tile.stat);
  return (
    <Link
      href={`/b/${businessUuid}/${tile.segment}`}
      className={cn(
        "group flex flex-col rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/40",
        tile.done && "border-primary/25 bg-primary/[0.03]"
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-xl",
            tile.done ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="size-4.5" />
        </span>
        {tile.done === true && <CircleCheckIcon className="size-4 text-primary" />}
      </div>
      <span
        className={cn(
          "mt-3 font-heading leading-none font-semibold tabular-nums",
          isCount ? "text-3xl" : "truncate text-xl"
        )}
      >
        {tile.stat ?? "—"}
      </span>
      <span className="mt-1 text-base font-medium">{tile.title}</span>
      <span
        className={cn(
          "mt-0.5 truncate text-sm",
          tile.done ? "text-muted-foreground" : "font-medium text-primary"
        )}
      >
        {tile.done === null ? "—" : tile.done ? tile.summary : tile.cta}
      </span>
    </Link>
  );
}

export function OverviewView() {
  const { business } = useBusiness();

  const profile = useBusinessProfile(business.id);
  const services = useServices(business.id);
  const products = useProducts(business.id);
  const faqs = useFaqs(business.id);
  const policies = useBusinessPolicies(business.id);
  const documents = useDocuments(business.id);
  const members = useMembers(business.id);
  const targets = useTransferTargets(business.id);
  const calendar = useBusinessCalendarSettings(business.id);
  const providers = useIntegrationProviders(business.id);

  const resolvedProfile = dataOrNull(profile);

  const { tiles, progress } = buildCompleteness({
    profile: resolvedProfile,
    services: dataOrNull(services),
    products: dataOrNull(products),
    faqs: dataOrNull(faqs),
    policies: dataOrNull(policies),
    documents: dataOrNull(documents),
    members: dataOrNull(members),
    targets: dataOrNull(targets),
    calendar: dataOrNull(calendar),
    providers: dataOrNull(providers),
  });

  const logo = resolvedProfile?.logo ?? null;
  const percent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : null;

  const tileBySegment = new Map(tiles.map((tile) => [tile.segment, tile]));
  const labeledGroups = sectionGroups
    .filter((group) => group.label)
    .map((group) => ({
      label: group.label as string,
      tiles: group.items.flatMap((item) => {
        const tile = tileBySegment.get(item.segment);
        return tile ? [{ tile, icon: item.icon }] : [];
      }),
    }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo.url}
            alt=""
            className="h-32 w-auto max-w-[min(16rem,100%)] object-contain"
          />
        ) : (
          <span className="flex size-24 items-center justify-center rounded-3xl bg-primary/10 font-heading text-4xl font-semibold text-primary">
            {business.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="flex flex-col gap-0.5">
          <h1 className="font-heading text-2xl font-semibold">{business.name}</h1>
          <p className="text-sm text-muted-foreground">Business profile</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="font-heading text-4xl font-semibold tabular-nums">
          {percent === null ? "—" : `${percent}%`}
        </p>
        <p className="text-sm text-muted-foreground">
          {percent === null
            ? "Working out what's done…"
            : `${progress.done} of ${progress.total} sections done`}
        </p>
        <Progress value={percent ?? 0} className="mt-2 w-full max-w-md" />
      </div>

      {labeledGroups.map((group) => (
        <section key={group.label} className="flex flex-col gap-3">
          <h2 className="text-base font-medium text-muted-foreground">{group.label}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.tiles.map(({ tile, icon }) => (
              <StatTile
                key={tile.key}
                businessUuid={business.id}
                tile={tile}
                icon={icon}
              />
            ))}
          </div>
        </section>
      ))}

      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent ring-0">
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <SparklesIcon className="size-4.5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">Set up faster with AI</p>
              <p className="text-sm text-muted-foreground">
                Extract services, FAQs, policies and more from your website — you review
                everything before it&apos;s saved.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:pl-12">
            {EXTRACT_SECTIONS.map((section) => (
              <Button
                key={section.segment}
                variant="outline"
                size="sm"
                className="rounded-full bg-background/60"
                render={<Link href={`/b/${business.id}/${section.segment}`} />}
              >
                {section.title}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
