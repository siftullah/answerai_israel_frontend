"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBusiness } from "@/components/business/business-provider";
import { isNavActive, navHref } from "@/components/layout/nav-config";
import {
  settingsNavItems,
  type SettingsNavItem,
} from "@/components/settings/settings-nav-config";
import { cn } from "@/lib/utils";

/**
 * Settings sub-navigation: a quiet text-only rail on desktop and a
 * horizontally scrollable pill row on mobile — the same shape as the
 * business-profile SectionNav. Owner/admin-only items (Billing) are filtered
 * out for members.
 */
export function SettingsNav() {
  const { business, membership } = useBusiness();
  const pathname = usePathname();

  const privileged =
    membership.role.slug === "owner" || membership.role.slug === "admin";
  const items = settingsNavItems.filter((item) => !item.privileged || privileged);

  const isActive = (item: SettingsNavItem) =>
    isNavActive(pathname, navHref(business.id, item), item.exact);

  return (
    <>
      <nav aria-label="Settings sections" className="-mx-1 px-1 lg:hidden">
        <ul className="flex gap-1.5 overflow-x-auto pb-2">
          {items.map((item) => (
            <li key={item.segment} className="shrink-0">
              <Link
                href={navHref(business.id, item)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap",
                  isActive(item)
                    ? "border-transparent bg-primary/10 font-medium text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav
        aria-label="Settings sections"
        className="hidden w-52 shrink-0 lg:sticky lg:top-6 lg:block lg:self-start"
      >
        <p className="px-3 pb-3 font-heading text-lg font-semibold">Settings</p>
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item.segment}>
              <Link
                href={navHref(business.id, item)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm",
                  isActive(item)
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
