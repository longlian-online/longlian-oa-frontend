import { Suspense, useEffect, useState, type ReactElement } from "react";
import { Outlet, useLocation } from "react-router";
import AppBreadcrumb from "./AppBreadcrumb";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import PageTransition from "./PageTransition";
import OrganizationSidebar from "@/components/layout/OrganizationSidebar";
import PageLoading from "@/components/PageLoading";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
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
          <div
            aria-hidden={isSidebarHidden}
            className={cn(
              "h-full shrink-0 overflow-hidden transition-[width,opacity,transform] duration-300 ease-out",
              isSidebarHidden
                ? "pointer-events-none w-0 -translate-x-4 opacity-0"
                : "w-56 translate-x-0 opacity-100",
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
              <RouteErrorBoundary resetKey={pathname}>
                <Suspense fallback={<PageLoading message="页面加载中..." />}>
                  <Outlet />
                </Suspense>
              </RouteErrorBoundary>
            </PageTransition>
          </main>
        </div>
      </div>
    </CurrentUserProvider>
  );
}
