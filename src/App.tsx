import { Outlet, useLocation, useNavigation } from "react-router";

import PageTransition from "@/components/layout/PageTransition";

export default function App() {
  const location = useLocation();
  const navigation = useNavigation();
  const element = <Outlet />;

  return (
    <>
      {navigation.state !== "idle" && (
        <div
          role="status"
          className="fixed top-0 right-0 left-0 z-50 bg-background px-4 py-1 text-center text-sm text-muted-foreground"
        >
          页面加载中...
        </div>
      )}
      {location.pathname.startsWith("/dashboard") ? (
        element
      ) : (
        <PageTransition className="min-h-svh">{element}</PageTransition>
      )}
    </>
  );
}
