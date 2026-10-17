"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/components/business/business-provider";
import { FullPageLoader } from "@/components/full-page-loader";

/** Settings has no overview — land on Profile. */
export default function SettingsPage() {
  const router = useRouter();
  const { business } = useBusiness();

  useEffect(() => {
    router.replace(`/b/${business.id}/settings/profile`);
  }, [router, business.id]);

  return <FullPageLoader />;
}
