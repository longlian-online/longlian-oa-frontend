import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import { currentUserQuery } from "@/queries/session";
import { useApiQuery, useSessionSnapshot } from "@/hooks/queries/useApiQuery";

import type { UserInfoVO } from "@/types/user";

interface UseCurrentUserResult {
  user: UserInfoVO | null;
  role: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
const CurrentUserContext = createContext<UseCurrentUserResult | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const session = useSessionSnapshot();
  const query = useApiQuery(currentUserQuery);
  const { data, isLoading, error, refetch } = query;
  const refresh = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);
  const value = useMemo<UseCurrentUserResult>(
    () => ({
      user: data ?? null,
      role: session.role,
      isLoading,
      isAuthenticated: Boolean(session.token),
      error: error?.message ?? null,
      refresh,
    }),
    [data, error?.message, isLoading, refresh, session.role, session.token],
  );
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}
export function useCurrentUser(): UseCurrentUserResult {
  const context = useContext(CurrentUserContext);
  if (!context) throw new Error("useCurrentUser must be used within CurrentUserProvider");
  return context;
}
