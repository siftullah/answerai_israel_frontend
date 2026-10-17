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

/** Minimum members for the team tile to count (owner alone isn't a team). */
const MIN_TEAM_MEMBERS = 2;

export interface SectionTile {
  key: string;
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

const count = (n: number, singular: string, plural = `${singular}s`) =>
  `${n} ${n === 1 ? singular : plural}`;

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

  const tiles: SectionTile[] = [
    {
      key: "basic-info",
      title: "Basic info",
      segment: "business-profile/basic-info",
      done: basicInfoDone,
      stat: basicInfoDone === null ? null : basicInfoDone ? "Set" : "—",
      summary: "Details set",
      cta: "Add your details",
    },
    {
      key: "services",
      title: "Services",
      segment: "business-profile/services",
      done: servicesDone,
      stat: input.services ? String(input.services.length) : null,
      summary: count(input.services?.length ?? 0, "service"),
      cta: "Add a service",
    },
    {
      key: "products",
      title: "Products",
      segment: "business-profile/products",
      done: productsDone,
      stat: input.products ? String(input.products.length) : null,
      summary: count(input.products?.length ?? 0, "product"),
      cta: "Add a product",
    },
    {
      key: "faqs",
      title: "FAQs",
      segment: "business-profile/faqs",
      done: input.faqs ? input.faqs.length > 0 : null,
      stat: input.faqs ? String(input.faqs.length) : null,
      summary: count(input.faqs?.length ?? 0, "FAQ"),
      cta: "Add an FAQ",
    },
    {
      key: "policies",
      title: "Policies",
      segment: "business-profile/policies",
      done: input.policies ? input.policies.length > 0 : null,
      stat: input.policies ? String(input.policies.length) : null,
      summary: count(input.policies?.length ?? 0, "policy", "policies"),
      cta: "Add a policy",
    },
    {
      key: "docs",
      title: "Docs",
      segment: "business-profile/docs",
      done: input.documents ? readyDocs.length > 0 : null,
      stat: input.documents ? String(input.documents.length) : null,
      summary: count(input.documents?.length ?? 0, "doc"),
      cta: "Add a doc",
    },
    {
      key: "team",
      title: "Team",
      segment: "business-profile/team",
      done: input.members ? input.members.length >= MIN_TEAM_MEMBERS : null,
      stat: input.members ? String(input.members.length) : null,
      summary: count(input.members?.length ?? 0, "member"),
      cta: "Add your team",
    },
    {
      key: "transfers",
      title: "Transfers",
      segment: "business-profile/transfers",
      done: input.targets ? input.targets.length > 0 : null,
      stat: input.targets ? String(input.targets.length) : null,
      summary: count(input.targets?.length ?? 0, "target"),
      cta: "Add a target",
    },
    {
      key: "calendar",
      title: "Calendar",
      segment: "business-profile/calendar",
      done: input.calendar ? true : null,
      stat: input.calendar ? `${input.calendar.slot_interval_minutes} min` : null,
      summary: input.calendar ? `${input.calendar.slot_interval_minutes}-min slots` : "",
      cta: "Review defaults",
    },
    {
      key: "integrations",
      title: "Integrations",
      segment: "business-profile/integrations",
      done: input.providers ? Boolean(liveConnection) : null,
      stat: input.providers
        ? connectedNow
          ? "Connected"
          : pendingSetup
            ? "Connecting"
            : "Optional"
        : null,
      summary: connectedNow ? "Connected" : pendingSetup ? "Connecting" : "Optional",
      cta: "Optional",
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
