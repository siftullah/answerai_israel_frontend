import type { Metadata } from "next";
import { PhoneNumbersView } from "@/components/phone-numbers/phone-numbers-view";

export const metadata: Metadata = { title: "Phone numbers" };

export default function PhoneNumbersPage() {
  return <PhoneNumbersView />;
}
