import { useSyncExternalStore } from "react";
import { Navigate, useLocation } from "react-router";

import { getToken, subscribeSession } from "@/lib/session";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation();
  const isAuthenticated = useSyncExternalStore(
    subscribeSession,
    () => Boolean(getToken()),
    () => false,
  );

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
