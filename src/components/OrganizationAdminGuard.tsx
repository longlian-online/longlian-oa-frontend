import { Navigate } from "react-router";

import { getSessionRoles } from "@/lib/session";

interface OrganizationAdminGuardProps {
  children: React.ReactNode;
}

export default function OrganizationAdminGuard({ children }: OrganizationAdminGuardProps) {
  if (!getSessionRoles().includes("ORG_ADMIN")) {
    return <Navigate to="/dashboard/workshop" replace />;
  }

  return <>{children}</>;
}
