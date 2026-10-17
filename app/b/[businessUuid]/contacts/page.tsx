import { Suspense } from "react";
import type { Metadata } from "next";
import { ContactsView } from "@/components/contacts/contacts-view";

export const metadata: Metadata = { title: "Contacts" };

// Suspense: the view reads useSearchParams for the legacy ?contact= deep link.
export default function ContactsPage() {
  return (
    <Suspense>
      <ContactsView />
    </Suspense>
  );
}
