import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PhoneNumbersView } from "@/components/phone-numbers/phone-numbers-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("phoneNumbers");
  return { title: t("meta.title") };
}

export default function PhoneNumbersPage() {
  return <PhoneNumbersView />;
}
