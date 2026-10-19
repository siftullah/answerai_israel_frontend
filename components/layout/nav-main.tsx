"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useBusiness } from "@/components/business/business-provider";
import {
  isNavActive,
  navHref,
  navMain,
  navSetup,
  type NavChild,
  type NavItem,
} from "@/components/layout/nav-config";
import type { ModuleKey } from "@/lib/api/types";

export function NavMain() {
  const t = useTranslations("layout");
  return (
    <>
      <SidebarGroup className="py-1.5">
        <NavItems items={navMain} />
      </SidebarGroup>
      <SidebarGroup className="mt-4 py-1.5">
        <SidebarGroupLabel className="h-7">{t("sidebar.setupGroup")}</SidebarGroupLabel>
        <NavItems items={navSetup} />
      </SidebarGroup>
    </>
  );
}

function NavItems({ items }: { items: NavItem[] }) {
  const { business, modules } = useBusiness();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const t = useTranslations("layout");

  const enabled = new Set<ModuleKey>(
    modules.filter((m) => m.enabled).map((m) => m.key)
  );
  const visible = (entry: NavItem | NavChild) => !entry.module || enabled.has(entry.module);

  const renderLeaf = (item: NavItem, href: string) => (
    <SidebarMenuItem key={item.segment}>
      <SidebarMenuButton
        className="h-9 gap-2.5 px-3 text-[15px] [&_svg]:size-5"
        isActive={isNavActive(pathname, href, item.exact)}
        // The mobile sheet doesn't close itself on navigation.
        render={<Link href={href} onClick={() => setOpenMobile(false)} />}
      >
        <item.icon />
        <span>{t(`nav.${item.title}`)}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <SidebarMenu className="gap-1">
      {items.filter(visible).map((item) => {
        const href = navHref(business.id, item);
        const children = item.children?.filter(visible) ?? [];
        return children.length > 0 ? (
          <NavBranch key={item.segment} item={item} href={href} subItems={children} />
        ) : (
          renderLeaf(item, href)
        );
      })}
    </SidebarMenu>
  );
}

/** Expandable nav row (toggle only — its children are the pages). */
function NavBranch({
  item,
  href,
  subItems,
}: {
  item: NavItem;
  href: string;
  subItems: NavChild[];
}) {
  const { business } = useBusiness();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const t = useTranslations("layout");

  const branchActive = isNavActive(pathname, href);

  // Controlled so navigating into the branch expands it while manual
  // toggling still works. The previous-value compare is the React
  // "adjust state during render" pattern — not an effect.
  const [open, setOpen] = useState(branchActive);
  const [prevActive, setPrevActive] = useState(branchActive);
  if (branchActive !== prevActive) {
    setPrevActive(branchActive);
    if (branchActive) setOpen(true);
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} render={<SidebarMenuItem />}>
      <CollapsibleTrigger
        render={<SidebarMenuButton className="h-9 gap-2.5 px-3 text-[15px] [&_svg]:size-5" />}
      >
        <item.icon />
        <span>{t(`nav.${item.title}`)}</span>
        <ChevronRightIcon className="ms-auto transition-transform group-aria-expanded/menu-button:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {subItems.map((child) => {
            const childHref = navHref(business.id, child);
            return (
              <SidebarMenuSubItem key={child.segment}>
                <SidebarMenuSubButton
                  className="h-8 gap-2.5 text-[15px]"
                  isActive={isNavActive(pathname, childHref, child.exact)}
                  render={<Link href={childHref} onClick={() => setOpenMobile(false)} />}
                >
                  <span>{t(`nav.${child.title}`)}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}
