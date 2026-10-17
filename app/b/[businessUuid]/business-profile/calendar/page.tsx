import type { Metadata } from "next";
import { CalendarSettingsView } from "@/components/business-profile/calendar/calendar-settings-view";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarSettingsPage() {
  return <CalendarSettingsView />;
}
