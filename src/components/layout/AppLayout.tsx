import { useEffect, useState, type ReactElement } from "react";
import { Outlet, useLocation } from "react-router";
import AppBreadcrumb from "./AppBreadcrumb";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import PageTransition from "./PageTransition";
import OrganizationSidebar from "@/components/layout/OrganizationSidebar";
import { useOrganizationSwitcher } from "@/hooks/useOrganizationSwitcher";
import { cn } from "@/lib/utils";
import { CurrentUserProvider } from "@/hooks/useCurrentUser";

export default function AppLayout(): ReactElement {
  const { pathname } = useLocation();
  const isWorkshop = pathname.startsWith("/dashboard/workshop");
  const switcher = useOrganizationSwitcher();
  const [isOrganizationListOpen, setIsOrganizationListOpen] = useState(false);
  const isSidebarHidden = isWorkshop && !isOrganizationListOpen;

  useEffect(() => {
    setIsOrganizationListOpen(false);
  }, [pathname]);

  return (
    <CurrentUserProvider>
      <div className="bg-background flex h-svh flex-col overflow-hidden">
        <AppHeader switcher={switcher} onMore={() => setIsOrganizationListOpen(true)} />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* 宽度立即切换。对 width 做过渡会在收起过程中逐帧重排主区域。 */}
          <div
            aria-hidden={isSidebarHidden}
            className={cn(
              "h-full shrink-0 overflow-hidden",
              isSidebarHidden ? "pointer-events-none w-0" : "w-56",
            )}
            inert={isSidebarHidden}
          >
            {isOrganizationListOpen ? (
              <OrganizationSidebar
                switcher={switcher}
                onBack={() => setIsOrganizationListOpen(false)}
              />
            ) : (
              <AppSidebar />
            )}
          </div>
          <main className="min-w-0 flex-1 overflow-y-auto px-6 py-6 [scrollbar-gutter:stable]">
            <AppBreadcrumb />
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
        </div>
      </div>
    </CurrentUserProvider>
  );
}
