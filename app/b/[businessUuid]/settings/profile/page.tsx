import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileView } from "@/components/settings/profile/profile-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("profile.meta.title") };
}

export default function ProfilePage() {
  return <ProfileView />;
}
