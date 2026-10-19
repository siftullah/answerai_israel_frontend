import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NotificationsView } from "@/components/settings/notifications/notifications-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("notifications.meta.title") };
}

export default function NotificationsSettingsPage() {
  return <NotificationsView />;
}
