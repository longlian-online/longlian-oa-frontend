import { useState, type ReactElement } from "react";
import { Popover } from "@base-ui/react/popover";
import { Building2, ChevronDown, ChevronRight, Plus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { UseOrganizationSwitcherResult } from "@/hooks/useOrganizationSwitcher";
import type { OrganizationSimpleInfoVO } from "@/types/user";

interface OrganizationIdentityProps {
  switcher: UseOrganizationSwitcherResult;
  onMore: () => void;
  onJoin: () => void;
}

export function declaredOrganization(
  organizations: readonly OrganizationSimpleInfoVO[],
  declaredOrgId: string | null,
): OrganizationSimpleInfoVO | null {
  if (!declaredOrgId) return null;
  return organizations.find((item) => item.id === declaredOrgId) ?? null;
}

export default function OrganizationIdentity({
  switcher,
  onMore,
  onJoin,
}: OrganizationIdentityProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const organization = declaredOrganization(switcher.organizations, switcher.currentOrgId);

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger
        openOnHover
        delay={150}
        closeDelay={200}
        aria-label="切换组织"
        className="hover:bg-secondary focus-visible:ring-ring flex max-w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 outline-none transition-colors focus-visible:ring-2"
      >
        <Avatar className="size-7 rounded-lg">
          <AvatarImage src={organization?.avatarUrl} alt="" />
          <AvatarFallback className="rounded-lg">
            {organization?.name?.slice(0, 1) || <Building2 className="size-3.5" />}
          </AvatarFallback>
        </Avatar>
        <span className="text-foreground truncate text-sm font-semibold">
          {organization?.name ?? "组织"}
        </span>
        <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8}>
          <Popover.Popup className="border-border bg-popover text-popover-foreground w-64 max-w-[calc(100vw-2rem)] rounded-xl border shadow-lg outline-none">
            <div className="p-2">
              <Popover.Title className="text-muted-foreground px-2 py-2 text-xs font-medium">
                最近切换
              </Popover.Title>
              {switcher.isLoading ? (
                <p className="text-muted-foreground px-2 py-3 text-sm">加载中...</p>
              ) : switcher.error ? (
                <div className="space-y-1 px-2 py-2">
                  <p className="text-muted-foreground text-sm">组织列表加载失败</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void switcher.refreshOrganizations()}
                  >
                    重试
                  </Button>
                </div>
              ) : switcher.recentOrganizations.length === 0 ? (
                <p className="text-muted-foreground px-2 py-3 text-sm">暂无最近切换的组织</p>
              ) : (
                switcher.recentOrganizations.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="h-auto w-full justify-start gap-2.5 px-2 py-2"
                    disabled={item.id === switcher.currentOrgId || switcher.switchingOrgId !== null}
                    onClick={() => void switcher.switchOrganization(item.id)}
                  >
                    <Avatar size="sm">
                      <AvatarImage src={item.avatarUrl} alt="" />
                      <AvatarFallback>
                        {item.name?.slice(0, 1) || <Building2 className="size-3.5" />}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-left">{item.name}</span>
                    {switcher.switchingOrgId === item.id ? (
                      <span className="text-muted-foreground text-xs">切换中...</span>
                    ) : (
                      item.id === switcher.currentOrgId && (
                        <span className="text-muted-foreground text-xs">当前</span>
                      )
                    )}
                  </Button>
                ))
              )}
              <Button
                variant="ghost"
                className="mt-1 w-full justify-between"
                onClick={() => {
                  setIsOpen(false);
                  onMore();
                }}
              >
                更多
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2.5"
                onClick={() => {
                  setIsOpen(false);
                  onJoin();
                }}
              >
                <Plus className="size-4" />
                加入组织
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
