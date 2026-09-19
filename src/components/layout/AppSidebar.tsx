import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { NavLink, useLocation } from "react-router";

import { isOrganizationAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";
import OrganizationIdentity from "./OrganizationIdentity";

const navItems = [
  {
    to: "/dashboard/planning",
    label: "企划",
    icon: BookOpen,
    activePrefixes: ["/dashboard/planning", "/dashboard/workshop"],
  },
  {
    to: "/dashboard/org-admin",
    label: "组织管理",
    icon: Settings2,
    activePrefixes: ["/dashboard/org-admin"],
    adminOnly: true,
    children: [
      { to: "/dashboard/org-admin/projects", label: "企划" },
      { to: "/dashboard/org-admin/project-types", label: "企划类型" },
      { to: "/dashboard/org-admin/members", label: "成员" },
      { to: "/dashboard/org-admin/applications", label: "入组申请" },
      { to: "/dashboard/org-admin/invites", label: "组织邀请" },
      { to: "/dashboard/org-admin/tasks", label: "原子任务" },
      { to: "/dashboard/org-admin/workflows", label: "工作流" },
      { to: "/dashboard/org-admin/settings", label: "组织设置" },
    ],
  },
] as const;

function isPathActive(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function AppSidebar() {
  const { pathname } = useLocation();
  const isOrgAdmin = isOrganizationAdmin();
  const [isOrganizationMenuOpen, setIsOrganizationMenuOpen] = useState(true);

  return (
    <aside className="border-border bg-background flex h-full w-56 shrink-0 flex-col border-r">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <OrganizationIdentity />
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {navItems
          .filter((item) => !("adminOnly" in item) || !item.adminOnly || isOrgAdmin)
          .map((item) => {
            const isActive = isPathActive(pathname, item.activePrefixes);
            const hasChildren = "children" in item;

            return (
              <div key={item.to}>
                <div className="flex items-center">
                  <NavLink
                    to={item.to}
                    className={({ isActive: isNavActive }) =>
                      cn(
                        "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                        isNavActive || isActive
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                  {hasChildren && (
                    <button
                      type="button"
                      aria-label={isOrganizationMenuOpen ? "收起组织管理菜单" : "展开组织管理菜单"}
                      aria-expanded={isOrganizationMenuOpen}
                      className={cn(
                        "-ml-10 mr-1 flex size-7 items-center justify-center rounded-md transition-colors",
                        isActive
                          ? "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                      onClick={() => setIsOrganizationMenuOpen((open) => !open)}
                    >
                      {isOrganizationMenuOpen ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                  )}
                </div>
                {hasChildren && isOrganizationMenuOpen && (
                  <div className="ml-6 flex flex-col gap-1 border-l border-border py-1 pl-3">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive: isChildActive }) =>
                          cn(
                            "block rounded-md px-3 py-2 text-sm transition-colors",
                            isChildActive
                              ? "bg-secondary font-medium text-foreground"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                          )
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </nav>
    </aside>
  );
}
