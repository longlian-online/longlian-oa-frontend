import { useEffect, useState } from "react";
import { Bell, BookOpen, ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { NavLink, useLocation } from "react-router";

import { getUserOrganizations } from "@/api/user";
import { isOrganizationAdmin } from "@/lib/session";
import { getCurrentOrgId } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { OrganizationSimpleInfoVO } from "@/types/user";

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
  const [organization, setOrganization] = useState<OrganizationSimpleInfoVO | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOrganization(): Promise<void> {
      try {
        const organizations = await getUserOrganizations();
        if (cancelled) return;

        const currentOrgId = getCurrentOrgId();
        setOrganization(
          organizations.find((item) => item.id === currentOrgId) ?? organizations[0] ?? null,
        );
      } catch {
        if (!cancelled) setOrganization(null);
      }
    }

    void loadOrganization();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="border-border bg-background flex h-full w-56 shrink-0 flex-col border-r">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        {organization?.avatarUrl ? (
          <img
            src={organization.avatarUrl}
            alt={`${organization.name}头像`}
            className="h-7 w-7 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "var(--theme-accent-gradient)" }}
          >
            <Bell className="h-3.5 w-3.5 text-white" />
          </div>
        )}
        <span className="text-foreground truncate text-sm font-semibold">
          {organization?.name ?? "组织"}
        </span>
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
                          ? "bg-foreground text-background font-medium"
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
                          ? "text-background/70 hover:bg-background/10 hover:text-background"
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
                  <div className="ml-6 border-l border-border py-1 pl-3">
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
