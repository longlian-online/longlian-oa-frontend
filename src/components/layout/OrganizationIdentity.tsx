import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { getUserOrganizations } from "@/api/user";
import { getCurrentOrgId } from "@/lib/session";
import type { OrganizationSimpleInfoVO } from "@/types/user";

export default function OrganizationIdentity() {
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
    <div className="flex min-w-0 items-center gap-2.5">
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
  );
}
