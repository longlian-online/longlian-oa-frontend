import { useLocation, useRoutes } from "react-router";
import routes from "~react-pages";

import PageTransition from "@/components/layout/PageTransition";

export default function App() {
  const location = useLocation();
  const element = useRoutes(routes, location);

  if (location.pathname.startsWith("/dashboard")) {
    return element;
  }

  return <PageTransition className="min-h-svh">{element}</PageTransition>;
}
