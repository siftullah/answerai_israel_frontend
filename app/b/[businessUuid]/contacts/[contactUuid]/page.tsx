import type { Metadata } from "next";
import { ContactDetailView } from "@/components/contacts/detail/contact-detail-view";

export const metadata: Metadata = { title: "Contact" };

export default function ContactDetailPage() {
  return <ContactDetailView />;
}
