import { Outlet, useLocation } from "react-router";
import AppBreadcrumb from "./AppBreadcrumb";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import PageTransition from "./PageTransition";
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const { pathname } = useLocation();
  const isWorkshop = pathname.startsWith("/dashboard/workshop");

  return (
    <div className="bg-background flex h-svh overflow-hidden">
      <div
        aria-hidden={isWorkshop}
        className={cn(
          "h-full shrink-0 overflow-hidden transition-[width,opacity,transform] duration-300 ease-out",
          isWorkshop
            ? "pointer-events-none w-0 -translate-x-4 opacity-0"
            : "w-56 translate-x-0 opacity-100",
        )}
        inert={isWorkshop}
      >
        <AppSidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <AppBreadcrumb />
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
