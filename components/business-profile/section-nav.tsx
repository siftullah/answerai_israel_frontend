"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBusiness } from "@/components/business/business-provider";
import { isNavActive, navHref } from "@/components/layout/nav-config";
import {
  sectionGroups,
  type SectionItem,
} from "@/components/business-profile/section-nav-config";
import { cn } from "@/lib/utils";

/**
 * Business profile sub-navigation: a quiet text-only rail on desktop
 * (kept visually lighter than the main sidebar) and a horizontally
 * scrollable pill row on mobile. Both render from section-nav-config.
 */
export function SectionNav() {
  const { business, membership } = useBusiness();
  const pathname = usePathname();

  const privileged =
    membership.role.slug === "owner" || membership.role.slug === "admin";

  // Filtered once and shared by both renders below; a group that loses all
  // its items drops out rather than leaving a dangling label.
  const groups = sectionGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.privileged || privileged),
    }))
    .filter((group) => group.items.length > 0);

  const isActive = (item: SectionItem) =>
    isNavActive(pathname, navHref(business.id, item), item.exact);

  return (
    <>
      <nav aria-label="Business profile sections" className="-mx-1 px-1 lg:hidden">
        <ul className="flex gap-1.5 overflow-x-auto pb-2">
          {groups
            .flatMap((group) => group.items)
            .map((item) => (
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
        aria-label="Business profile sections"
        className="hidden w-52 shrink-0 lg:sticky lg:top-6 lg:block lg:self-start"
      >
        <p className="px-3 pb-3 font-heading text-lg font-semibold">
          Business profile
        </p>
        {groups.map((group, index) => (
          <div key={group.label ?? "top"} className={cn(index > 0 && "mt-5")}>
            {group.label && (
              <p className="px-3 pb-1.5 text-sm font-medium text-muted-foreground">
                {group.label}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
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
          </div>
        ))}
      </nav>
    </>
  );
}
