import { ArrowLeft, Building2 } from "lucide-react";
import type { ReactElement } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UseOrganizationSwitcherResult } from "@/hooks/useOrganizationSwitcher";

interface OrganizationSidebarProps {
  switcher: UseOrganizationSwitcherResult;
  onBack: () => void;
}

export default function OrganizationSidebar({
  switcher,
  onBack,
}: OrganizationSidebarProps): ReactElement {
  return (
    <aside className="border-border bg-sidebar flex h-full w-56 shrink-0 flex-col border-r">
      <div className="border-border space-y-2 border-b px-3 py-3">
        <h2 className="px-2 text-sm font-semibold">组织列表</h2>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onBack}>
          <ArrowLeft className="size-4" />
          返回导航
        </Button>
      </div>
      <nav aria-label="组织列表" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {switcher.isLoading ? (
          <p className="text-muted-foreground px-2 py-3 text-sm">加载中...</p>
        ) : switcher.error ? (
          <div className="space-y-2 px-2 py-3">
            <p className="text-muted-foreground text-sm">组织列表加载失败</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void switcher.refreshOrganizations()}
            >
              重试
            </Button>
          </div>
        ) : switcher.organizations.length === 0 ? (
          <p className="text-muted-foreground px-2 py-3 text-sm">暂无已加入的组织</p>
        ) : (
          switcher.organizations.map((organization) => (
            <Button
              key={organization.id}
              variant="ghost"
              className={cn(
                "h-auto w-full justify-start gap-2.5 px-2 py-2.5",
                organization.id === switcher.currentOrgId && "bg-secondary disabled:opacity-100",
              )}
              disabled={
                organization.id === switcher.currentOrgId || switcher.switchingOrgId !== null
              }
              onClick={() => void switcher.switchOrganization(organization.id)}
            >
              <Avatar size="sm">
                <AvatarImage src={organization.avatarUrl} alt="" />
                <AvatarFallback>
                  {organization.name?.slice(0, 1) || <Building2 className="size-3.5" />}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-left">{organization.name}</span>
              {switcher.switchingOrgId === organization.id ? (
                <span className="text-muted-foreground text-xs">切换中...</span>
              ) : (
                organization.id === switcher.currentOrgId && (
                  <span className="text-muted-foreground text-xs">当前</span>
                )
              )}
            </Button>
          ))
        )}
      </nav>
    </aside>
  );
}
