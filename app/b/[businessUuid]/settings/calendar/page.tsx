import type { Metadata } from "next";
import { CalendarConnectionView } from "@/components/settings/calendar/calendar-connection-view";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarSettingsPage() {
  return <CalendarConnectionView />;
}
