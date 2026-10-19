import type {
  BusinessMember,
  BusinessPolicy,
  BusinessProfile,
  CalendarBusinessSettings,
  Faq,
  IntegrationProviderInfo,
  KnowledgeDocument,
  Product,
  Service,
  TransferTarget,
} from "@/lib/api/types";
import { rt } from "@/lib/i18n/runtime";

/** Minimum members for the team tile to count (owner alone isn't a team). */
const MIN_TEAM_MEMBERS = 2;

export interface SectionTile {
  key: string;
  /** Message key under layout.nav — rendered via t(`nav.${title}`). */
  title: string;
  /** Path segment under /b/{uuid} (matches section-nav-config). */
  segment: string;
  /** null = section data still loading or errored — excluded from progress. */
  done: boolean | null;
  /** Big tile figure: a bare count, or a short word; null = unresolved ("—"). */
  stat: string | null;
  summary: string;
  cta: string;
}

export interface Completeness {
  tiles: SectionTile[];
  /** Done/total over resolved required units (services+products merge into one "catalog" unit). */
  progress: { done: number; total: number };
}

/** null inputs = that section's query is loading or errored. */
export interface CompletenessInput {
  profile: BusinessProfile | null;
  services: Service[] | null;
  products: Product[] | null;
  faqs: Faq[] | null;
  policies: BusinessPolicy[] | null;
  documents: KnowledgeDocument[] | null;
  members: BusinessMember[] | null;
  targets: TransferTarget[] | null;
  calendar: CalendarBusinessSettings | null;
  providers: IntegrationProviderInfo[] | null;
}

export function buildCompleteness(input: CompletenessInput): Completeness {
  const basicInfoDone = input.profile
    ? Boolean(input.profile.description && input.profile.public_phone)
    : null;

  const servicesDone = input.services ? input.services.length > 0 : null;
  const productsDone = input.products ? input.products.length > 0 : null;
  // One catalog unit for progress: done if either list has entries; only
  // unresolved when neither list has resolved.
  const catalogDone =
    servicesDone === true || productsDone === true
      ? true
      : servicesDone === null && productsDone === null
        ? null
        : servicesDone === false && productsDone === false
          ? false
          : servicesDone ?? productsDone;

  const readyDocs = input.documents?.filter((doc) => doc.status !== "error") ?? [];
  const liveConnection = input.providers?.some(
    (provider) => provider.connection && provider.connection.status !== "disconnected"
  );
  const connectedNow = input.providers?.some(
    (provider) => provider.connection?.status === "connected"
  );
  const pendingSetup = input.providers?.some(
    (provider) => provider.connection?.status === "pending_setup"
  );
  const integrationsLabel = connectedNow
    ? rt("businessProfile.overview.tiles.integrations.connected")
    : pendingSetup
      ? rt("businessProfile.overview.tiles.integrations.connecting")
      : rt("businessProfile.overview.tiles.integrations.optional");

  const tiles: SectionTile[] = [
    {
      key: "basic-info",
      title: "basicInfo",
      segment: "business-profile/basic-info",
      done: basicInfoDone,
      stat: basicInfoDone === null ? null : basicInfoDone ? rt("businessProfile.overview.tiles.basicInfo.set") : "—",
      summary: rt("businessProfile.overview.tiles.basicInfo.summary"),
      cta: rt("businessProfile.overview.tiles.basicInfo.cta"),
    },
    {
      key: "services",
      title: "services",
      segment: "business-profile/services",
      done: servicesDone,
      stat: input.services ? String(input.services.length) : null,
      summary: rt("businessProfile.overview.tiles.services.summary", { count: input.services?.length ?? 0 }),
      cta: rt("businessProfile.overview.tiles.services.cta"),
    },
    {
      key: "products",
      title: "products",
      segment: "business-profile/products",
      done: productsDone,
      stat: input.products ? String(input.products.length) : null,
      summary: rt("businessProfile.overview.tiles.products.summary", { count: input.products?.length ?? 0 }),
      cta: rt("businessProfile.overview.tiles.products.cta"),
    },
    {
      key: "faqs",
      title: "faqs",
      segment: "business-profile/faqs",
      done: input.faqs ? input.faqs.length > 0 : null,
      stat: input.faqs ? String(input.faqs.length) : null,
      summary: rt("businessProfile.overview.tiles.faqs.summary", { count: input.faqs?.length ?? 0 }),
      cta: rt("businessProfile.overview.tiles.faqs.cta"),
    },
    {
      key: "policies",
      title: "policies",
      segment: "business-profile/policies",
      done: input.policies ? input.policies.length > 0 : null,
      stat: input.policies ? String(input.policies.length) : null,
      summary: rt("businessProfile.overview.tiles.policies.summary", { count: input.policies?.length ?? 0 }),
      cta: rt("businessProfile.overview.tiles.policies.cta"),
    },
    {
      key: "docs",
      title: "docs",
      segment: "business-profile/docs",
      done: input.documents ? readyDocs.length > 0 : null,
      stat: input.documents ? String(input.documents.length) : null,
      summary: rt("businessProfile.overview.tiles.docs.summary", { count: input.documents?.length ?? 0 }),
      cta: rt("businessProfile.overview.tiles.docs.cta"),
    },
    {
      key: "team",
      title: "team",
      segment: "business-profile/team",
      done: input.members ? input.members.length >= MIN_TEAM_MEMBERS : null,
      stat: input.members ? String(input.members.length) : null,
      summary: rt("businessProfile.overview.tiles.team.summary", { count: input.members?.length ?? 0 }),
      cta: rt("businessProfile.overview.tiles.team.cta"),
    },
    {
      key: "transfers",
      title: "transfers",
      segment: "business-profile/transfers",
      done: input.targets ? input.targets.length > 0 : null,
      stat: input.targets ? String(input.targets.length) : null,
      summary: rt("businessProfile.overview.tiles.transfers.summary", { count: input.targets?.length ?? 0 }),
      cta: rt("businessProfile.overview.tiles.transfers.cta"),
    },
    {
      key: "calendar",
      title: "calendar",
      segment: "business-profile/calendar",
      done: input.calendar ? true : null,
      stat: input.calendar
        ? rt("businessProfile.overview.tiles.calendar.stat", { minutes: input.calendar.slot_interval_minutes })
        : null,
      summary: input.calendar
        ? rt("businessProfile.overview.tiles.calendar.summary", { minutes: input.calendar.slot_interval_minutes })
        : "",
      cta: rt("businessProfile.overview.tiles.calendar.cta"),
    },
    {
      key: "integrations",
      title: "integrations",
      segment: "business-profile/integrations",
      done: input.providers ? Boolean(liveConnection) : null,
      stat: input.providers ? integrationsLabel : null,
      summary: integrationsLabel,
      cta: rt("businessProfile.overview.tiles.integrations.optional"),
    },
  ];

  // Required units: everything except integrations, with services+products
  // collapsed into the single catalog unit.
  const requiredUnits: (boolean | null)[] = [
    basicInfoDone,
    catalogDone,
    tiles.find((t) => t.key === "faqs")?.done ?? null,
    tiles.find((t) => t.key === "policies")?.done ?? null,
    tiles.find((t) => t.key === "docs")?.done ?? null,
    tiles.find((t) => t.key === "team")?.done ?? null,
    tiles.find((t) => t.key === "transfers")?.done ?? null,
    tiles.find((t) => t.key === "calendar")?.done ?? null,
  ];

  const resolved = requiredUnits.filter((unit) => unit !== null);
  return {
    tiles,
    progress: {
      done: resolved.filter(Boolean).length,
      total: resolved.length,
    },
  };
}
