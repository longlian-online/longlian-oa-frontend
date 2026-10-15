import { Outlet, useLocation } from "react-router";

import PageTransition from "@/components/layout/PageTransition";

export default function App() {
  const location = useLocation();
  const element = <Outlet />;

  return location.pathname.startsWith("/dashboard") ? (
    element
  ) : (
    <PageTransition className="min-h-svh">{element}</PageTransition>
  );
}
