import { Navigate } from "react-router";

import { useCurrentUser } from "@/hooks/useCurrentUser";

interface OrganizationAdminGuardProps {
  children: React.ReactNode;
}

export default function OrganizationAdminGuard({ children }: OrganizationAdminGuardProps) {
  const { roles, isLoading } = useCurrentUser();

  if (isLoading) return null;

  if (!roles.includes("ORG_ADMIN")) {
    return <Navigate to="/dashboard/workshop" replace />;
  }

  return <>{children}</>;
}
