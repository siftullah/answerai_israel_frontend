import type { Metadata } from "next";
import { DncView } from "@/components/contacts/dnc/dnc-view";

export const metadata: Metadata = { title: "Do not call (DNC)" };

export default function DncPage() {
  return <DncView />;
}
