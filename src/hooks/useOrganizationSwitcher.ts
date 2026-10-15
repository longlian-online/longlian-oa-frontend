import { useMemo, useRef } from "react";

import { getUserOrganizations, switchOrganization as submitOrganizationSwitch } from "@/api/user";
import { useApiMutation, useApiQuery, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import {
  prependRecentOrganization,
  readRecentOrganizationIds,
  writeRecentOrganizationIds,
} from "@/lib/recentOrganizations";
import { saveCurrentOrganization } from "@/lib/session";

import type { OrganizationSimpleInfoVO } from "@/types/user";

export interface UseOrganizationSwitcherResult {
  organizations: OrganizationSimpleInfoVO[];
  recentOrganizations: OrganizationSimpleInfoVO[];
  currentOrgId: string | null;
  isLoading: boolean;
  error: string | null;
  switchingOrgId: string | null;
  refreshOrganizations: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
}

export function useOrganizationSwitcher(): UseOrganizationSwitcherResult {
  const session = useSessionSnapshot();
  const query = useApiQuery({
    key: ["organizations"],
    scope: "account",
    queryFn: getUserOrganizations,
  });
  const mutation = useApiMutation({
    scope: "account",
    mutationFn: submitOrganizationSwitch,
    invalidate: [["currentUser"]],
  });
  const switchLock = useRef(false);
  const organizations = query.data ?? [];
  const recentOrganizations = useMemo(
    (): OrganizationSimpleInfoVO[] =>
      (session.userId ? readRecentOrganizationIds(session.userId) : []).flatMap((id) => {
        const org = organizations.find((item) => item.id === id);
        return org ? [org] : [];
      }),
    [organizations, session.userId],
  );
  async function switchOrganization(orgId: string): Promise<void> {
    if (
      switchLock.current ||
      orgId === session.orgId ||
      !session.userId ||
      !organizations.some((item) => item.id === orgId)
    )
      return;
    switchLock.current = true;
    try {
      const result = await mutation.mutateAsync({ orgId });
      writeRecentOrganizationIds(
        session.userId,
        prependRecentOrganization(readRecentOrganizationIds(session.userId), result.id),
      );
      saveCurrentOrganization(result.id, result.role);
      window.location.replace("/dashboard/planning");
    } catch {
      // 最终错误由共享缓存通知；取消和过期会话不提示。
    } finally {
      switchLock.current = false;
    }
  }
  return {
    organizations,
    recentOrganizations,
    currentOrgId: session.orgId,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    switchingOrgId: mutation.isPending ? (mutation.variables?.orgId ?? null) : null,
    refreshOrganizations: async (): Promise<void> => {
      await query.refetch();
    },
    switchOrganization,
  };
}
