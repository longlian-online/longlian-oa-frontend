import { useEffect, useState } from "react";
import { Bell, BookOpen, Settings2 } from "lucide-react";
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
  },
] as const;

function isPathActive(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function AppSidebar() {
  const { pathname } = useLocation();
  const isOrgAdmin = isOrganizationAdmin();
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
          .map(({ to, label, icon: Icon, activePrefixes }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive || isPathActive(pathname, activePrefixes)
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
      </nav>
    </aside>
  );
}
