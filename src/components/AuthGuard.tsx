import { Navigate, useLocation } from "react-router";

import { getToken } from "@/lib/session";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation();
  const isAuthenticated = Boolean(getToken());

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
