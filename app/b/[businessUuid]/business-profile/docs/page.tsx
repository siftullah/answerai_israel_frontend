import type { Metadata } from "next";
import { DocsView } from "@/components/business-profile/docs/docs-view";

export const metadata: Metadata = { title: "Docs" };

export default function DocsPage() {
  return <DocsView />;
}
