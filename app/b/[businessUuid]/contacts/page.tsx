import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactsView } from "@/components/contacts/contacts-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contacts");
  return { title: t("meta.title") };
}

// Suspense: the view reads useSearchParams for the legacy ?contact= deep link.
export default function ContactsPage() {
  return (
    <Suspense>
      <ContactsView />
    </Suspense>
  );
}
