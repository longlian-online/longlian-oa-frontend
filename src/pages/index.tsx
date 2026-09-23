import { Navigate } from "react-router";

import { getToken } from "@/lib/session";

export default function Home() {
  if (getToken()) {
    return <Navigate to="/dashboard/planning" replace />;
  }

  return <Navigate to="/login" replace />;
}
