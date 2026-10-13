import { Navigate } from "react-router";

import { getAdminToken } from "@/lib/session";

export default function AdminHomePage() {
  const token = getAdminToken();

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Navigate to="/admin/admins" replace />;
}
