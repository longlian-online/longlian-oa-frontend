import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError } from "@/api/request";
import {
  getUserOrganizations,
  invalidateUserOrganizationsCache,
  switchOrganization as submitOrganizationSwitch,
} from "@/api/user";
import { $tip } from "@/components/tip";
import { AuthExpiredError } from "@/lib/authError";
import {
  prependRecentOrganization,
  readRecentOrganizationIds,
  writeRecentOrganizationIds,
} from "@/lib/recentOrganizations";
import { getCurrentOrgId, getToken, getUserId, saveCurrentOrganization } from "@/lib/session";
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
  const [userId] = useState(getUserId);
  const [currentOrgId] = useState(getCurrentOrgId);
  const [recentIds] = useState(() => (userId ? readRecentOrganizationIds(userId) : []));
  const [organizations, setOrganizations] = useState<OrganizationSimpleInfoVO[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);
  const mounted = useRef(false);
  const requestSequence = useRef(0);
  const pendingRequest = useRef<Promise<void> | null>(null);
  const switchLock = useRef(false);

  const loadOrganizations = useCallback((): Promise<void> => {
    if (!userId) return Promise.resolve();
    const sequence = ++requestSequence.current;
    setIsLoading(true);
    setError(null);
    const task = (async (): Promise<void> => {
      try {
        const result = await getUserOrganizations();
        if (mounted.current && sequence === requestSequence.current && getUserId() === userId) {
          setOrganizations(result);
        }
      } catch (cause) {
        if (mounted.current && sequence === requestSequence.current) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      } finally {
        if (mounted.current && sequence === requestSequence.current) setIsLoading(false);
      }
    })();
    pendingRequest.current = task;
    return task;
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    void loadOrganizations();
    return (): void => {
      mounted.current = false;
      requestSequence.current += 1;
    };
  }, [loadOrganizations]);

  const refreshOrganizations = useCallback(async (): Promise<void> => {
    if (!userId) return;
    // 等待本 Hook 的单飞请求结束，失效后才允许重新查询。
    while (pendingRequest.current) {
      const pending = pendingRequest.current;
      await pending;
      if (pendingRequest.current === pending) pendingRequest.current = null;
    }
    if (!mounted.current || getUserId() !== userId) return;
    invalidateUserOrganizationsCache();
    await loadOrganizations();
  }, [loadOrganizations, userId]);

  const switchOrganization = useCallback(
    async (orgId: string): Promise<void> => {
      if (
        switchLock.current ||
        orgId === currentOrgId ||
        !organizations.some((organization) => organization.id === orgId)
      )
        return;
      const submittedUserId = getUserId();
      const submittedToken = getToken();
      if (!submittedUserId || !submittedToken || submittedUserId !== userId) return;
      switchLock.current = true;
      setSwitchingOrgId(orgId);
      try {
        const result = await submitOrganizationSwitch({ orgId });
        if (getUserId() !== submittedUserId || getToken() !== submittedToken) return;
        saveCurrentOrganization(result.id, result.role);
        writeRecentOrganizationIds(
          submittedUserId,
          prependRecentOrganization(readRecentOrganizationIds(submittedUserId), result.id),
        );
        window.location.replace("/dashboard/planning");
      } catch (cause) {
        if (!(cause instanceof ApiError) && !(cause instanceof AuthExpiredError)) {
          $tip(cause instanceof Error ? cause.message : String(cause), "error");
        }
      } finally {
        switchLock.current = false;
        if (mounted.current) setSwitchingOrgId(null);
      }
    },
    [currentOrgId, organizations, userId],
  );

  const recentOrganizations = useMemo(
    (): OrganizationSimpleInfoVO[] =>
      recentIds.flatMap((id) => {
        const organization = organizations.find((item) => item.id === id);
        return organization ? [organization] : [];
      }),
    [organizations, recentIds],
  );

  return {
    organizations,
    recentOrganizations,
    currentOrgId,
    isLoading,
    error,
    switchingOrgId,
    refreshOrganizations,
    switchOrganization,
  };
}
