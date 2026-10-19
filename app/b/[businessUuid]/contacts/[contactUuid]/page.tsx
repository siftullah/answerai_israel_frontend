import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactDetailView } from "@/components/contacts/detail/contact-detail-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contacts");
  return { title: t("meta.detailTitle") };
}

export default function ContactDetailPage() {
  return <ContactDetailView />;
}
