"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/layout/nav-main";
import { NavUser } from "@/components/layout/nav-user";
import { useBusiness } from "@/components/business/business-provider";

export function AppSidebar() {
  const { business } = useBusiness();

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas">
      <SidebarHeader>
        {/* px-3 lines the logo's left edge up with the nav item icons. */}
        <Link href={`/b/${business.id}`} className="mb-3 flex items-center px-3 py-1.5">
          <Logo className="h-16" />
        </Link>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
