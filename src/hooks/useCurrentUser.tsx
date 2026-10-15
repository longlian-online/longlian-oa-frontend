import { createContext, useContext, type ReactNode } from "react";

import { getCurrentUser } from "@/api/user";
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
  const query = useApiQuery({ key: ["currentUser"], queryFn: getCurrentUser, scope: "account" });
  const value: UseCurrentUserResult = {
    user: query.data ?? null,
    role: session.role,
    isLoading: query.isLoading,
    isAuthenticated: Boolean(session.token),
    error: query.error?.message ?? null,
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  };
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}
export function useCurrentUser(): UseCurrentUserResult {
  const context = useContext(CurrentUserContext);
  if (!context) throw new Error("useCurrentUser must be used within CurrentUserProvider");
  return context;
}
