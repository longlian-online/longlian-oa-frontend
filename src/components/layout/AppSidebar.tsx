import { BookOpen, type LucideIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

interface SidebarItem {
  to: string;
  label: string;
  icon?: LucideIcon;
  activePrefixes: readonly string[];
}

const planningItems: readonly SidebarItem[] = [
  {
    to: "/dashboard/planning",
    label: "企划",
    icon: BookOpen,
    activePrefixes: ["/dashboard/planning"],
  },
];

const orgAdminItems: readonly SidebarItem[] = [
  {
    to: "/dashboard/org-admin/projects",
    label: "企划",
    activePrefixes: ["/dashboard/org-admin/projects"],
  },
  {
    to: "/dashboard/org-admin/project-types",
    label: "企划类型",
    activePrefixes: ["/dashboard/org-admin/project-types"],
  },
  {
    to: "/dashboard/org-admin/members",
    label: "成员",
    activePrefixes: ["/dashboard/org-admin/members", "/dashboard/org-admin/invites"],
  },
  {
    to: "/dashboard/org-admin/applications",
    label: "入组申请",
    activePrefixes: ["/dashboard/org-admin/applications"],
  },
  {
    to: "/dashboard/org-admin/tasks",
    label: "原子任务",
    activePrefixes: ["/dashboard/org-admin/tasks"],
  },
  {
    to: "/dashboard/org-admin/workflows",
    label: "工作流",
    activePrefixes: ["/dashboard/org-admin/workflows", "/dashboard/org-admin/create"],
  },
  {
    to: "/dashboard/org-admin/settings",
    label: "组织设置",
    activePrefixes: ["/dashboard/org-admin/settings"],
  },
];

function isSidebarItemActive(pathname: string, item: SidebarItem): boolean {
  if (
    item.activePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return true;
  }
  if (pathname === "/dashboard" && item.to === "/dashboard/planning") return true;
  return pathname === "/dashboard/org-admin" && item.to === "/dashboard/org-admin/projects";
}

function sidebarItems(pathname: string, isOrgAdmin: boolean): readonly SidebarItem[] {
  if (pathname.startsWith("/dashboard/workshop")) return [];
  if (pathname.startsWith("/dashboard/org-admin")) return isOrgAdmin ? orgAdminItems : [];
  return planningItems;
}

export default function AppSidebar() {
  const { pathname } = useLocation();
  const { role } = useCurrentUser();
  const items = sidebarItems(pathname, role === "ORG_ADMIN");

  if (items.length === 0) return null;

  return (
    <aside className="border-border bg-sidebar flex h-full w-56 shrink-0 flex-col overflow-y-auto border-r">
      <nav aria-label="侧栏" className="flex-1 space-y-0.5 px-3 py-3">
        {items.map((item) => {
          const isActive = isSidebarItemActive(pathname, item);
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
