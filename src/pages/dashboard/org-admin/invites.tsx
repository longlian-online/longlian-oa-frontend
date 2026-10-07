import { Navigate } from "react-router";

import OrganizationAdminGuard from "@/components/OrganizationAdminGuard";

export default function OrganizationInvitesPage(): React.JSX.Element {
  return (
    <OrganizationAdminGuard>
      <Navigate to="/dashboard/org-admin/members" replace />
    </OrganizationAdminGuard>
  );
}
