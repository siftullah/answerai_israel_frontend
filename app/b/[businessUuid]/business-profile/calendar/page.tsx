import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CalendarSettingsView } from "@/components/business-profile/calendar/calendar-settings-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businessProfile");
  return { title: t("meta.calendar") };
}

export default function CalendarSettingsPage() {
  return <CalendarSettingsView />;
}
