import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PublicQuoteView } from "@/components/public-quote/public-quote-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("publicQuote");
  return { title: t("meta.title") };
}

/**
 * The customer-facing accept-link page. Unauthenticated by design — the
 * non-guessable token in the URL is the whole identity, and the API only
 * serves quotes that have actually been sent.
 */
export default function PublicQuotePage() {
  return <PublicQuoteView />;
}
