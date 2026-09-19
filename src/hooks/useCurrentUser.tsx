import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { getCurrentUser } from "@/api/user";
import { getSessionRoles, getToken } from "@/lib/session";
import type { UserInfoVO } from "@/types/user";

interface UseCurrentUserResult {
  user: UserInfoVO | null;
  roles: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CurrentUserContext = createContext<UseCurrentUserResult | null>(null);

function useCurrentUserState(): UseCurrentUserResult {
  const [user, setUser] = useState<UserInfoVO | null>(null);
  const [roles, setRoles] = useState<string[]>(getSessionRoles);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!getToken()) {
      setUser(null);
      setRoles([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setRoles(currentUser.roles ?? getSessionRoles());
    } catch (refreshError) {
      setUser(null);
      setRoles(getSessionRoles());
      setError(refreshError instanceof Error ? refreshError.message : "获取用户信息失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    user,
    roles,
    isLoading,
    isAuthenticated: !!getToken(),
    error,
    refresh,
  };
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const value = useCurrentUserState();
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): UseCurrentUserResult {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error("useCurrentUser must be used within CurrentUserProvider");
  }
  return context;
}
