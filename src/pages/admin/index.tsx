import { useSyncExternalStore } from "react";
import { Navigate } from "react-router";

import { getAdminToken, subscribeSession } from "@/lib/session";

export default function AdminHomePage() {
  const token = useSyncExternalStore(
    subscribeSession,
    () => getAdminToken(),
    () => null,
  );

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Navigate to="/admin/admins" replace />;
}
