import type { Metadata } from "next";
import { PublicQuoteView } from "@/components/public-quote/public-quote-view";

export const metadata: Metadata = { title: "Quote" };

/**
 * The customer-facing accept-link page. Unauthenticated by design — the
 * non-guessable token in the URL is the whole identity, and the API only
 * serves quotes that have actually been sent.
 */
export default function PublicQuotePage() {
  return <PublicQuoteView />;
}
