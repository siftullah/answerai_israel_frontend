"use client";

import { Fragment, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { LanguagePicker } from "@/components/language-picker";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { activeNavTrail } from "@/components/layout/nav-config";
import { ScrollContainerContext } from "@/components/layout/scroll-container-context";
import { useBusiness } from "@/components/business/business-provider";

/**
 * SidebarProvider writes the open state to this cookie on every toggle; read
 * it back for the initial render. Touching document here is safe: the shell
 * only mounts client-side after the gates resolve, so it never appears in
 * server HTML and there is no hydration to mismatch.
 */
function readSidebarCookie(): boolean {
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/);
  return match ? match[1] === "true" : true;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { business } = useBusiness();
  const pathname = usePathname();
  const t = useTranslations("layout");
  const [defaultOpen] = useState(readSidebarCookie);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Message keys under layout.nav — translated where rendered below.
  const trail = activeNavTrail(pathname, business.id);

  return (
    // h-svh caps the wrapper's min-h-svh: the shell owns the viewport and the
    // content div below is the one scroll container for every page.
    <SidebarProvider defaultOpen={defaultOpen} className="h-svh">
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ms-1" />
          {trail.length > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="me-2 data-vertical:h-4 data-vertical:self-center"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  {trail.map((crumb, index) =>
                    index < trail.length - 1 ? (
                      // Ancestors are toggle-only nav rows, not pages — plain text.
                      <Fragment key={crumb}>
                        <BreadcrumbItem className="max-md:hidden">
                          {t(`nav.${crumb}`)}
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="max-md:hidden" />
                      </Fragment>
                    ) : (
                      <BreadcrumbItem key={crumb}>
                        <BreadcrumbPage>{t(`nav.${crumb}`)}</BreadcrumbPage>
                      </BreadcrumbItem>
                    )
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </>
          )}
          <LanguagePicker className="ms-auto" />
        </header>
        <div
          ref={scrollRef}
          className="scrollbar-slim flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pt-0 sm:p-6 sm:pt-1"
        >
          <ScrollContainerContext.Provider value={scrollRef}>
            {children}
          </ScrollContainerContext.Provider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
