import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CalendarConnectionView } from "@/components/settings/calendar/calendar-connection-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("calendar.meta.title") };
}

export default function CalendarSettingsPage() {
  return <CalendarConnectionView />;
}
