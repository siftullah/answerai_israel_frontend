import type { Metadata } from "next";
import { CallResolver } from "@/components/calls/call-resolver";

export const metadata: Metadata = { title: "Call" };

export default function CallPage() {
  return <CallResolver />;
}
